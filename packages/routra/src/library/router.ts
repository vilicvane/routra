import _ from 'lodash';
import type {IComputedValue, IObservableValue} from 'mobx';
import {computed, observable, runInAction} from 'mobx';

import {createMergedObjectProxy, getCommonStartOfTwoArray} from './@utils';
import type {RouteType_} from './route';
import {createRoute} from './route';
import type {
  RouteBack_,
  RouteOperationSetter,
  RouteOperation_,
} from './route-operation';
import {createRouteBack, createRouteOperation} from './route-operation';
import type {SchemaRecord, SchemaRecord__} from './schema';
import type {Transition} from './transition';
import {createTransition} from './transition';
import type {
  ClassViewBuilder__,
  FunctionViewBuilder__,
  RootViewDefinitionRecord_,
  RootViewDefinitionRecord__,
  ViewEntry,
} from './view';

export class RouterClass_<
  TSchemaRecord,
  TRootViewDefinitionRecord,
  TTransitionState,
> {
  private _activeEntrySet = observable.set<ViewEntry>([], {
    deep: false,
  });

  constructor(schemas: TSchemaRecord, views?: TRootViewDefinitionRecord);
  constructor(
    private _schemas: SchemaRecord__,
    private _views: RootViewDefinitionRecord__ = {},
  ) {
    for (let [key, schema] of Object.entries(_schemas)) {
      if (schema === true) {
        schema = {};
      }

      (this as any)[key] = createRoute(this as any, schema, [key], new Map());
    }
  }

  get $back(): RouteBack_<TTransitionState> {
    const activeEntry = this._requireStableActiveViewEntry();

    const targetEntry = activeEntry.previous;

    if (!targetEntry) {
      throw new Error('No previous entry');
    }

    return createRouteBack(this, targetEntry, obsoleteEntries => {
      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.delete(activeEntry);

      for (const entry of obsoleteEntries) {
        activeEntrySet.delete(entry);
      }

      activeEntrySet.add(targetEntry);
    });
  }

  get $ableToBack(): boolean {
    return this._getStableActiveViewEntry()?.previous !== undefined;
  }

  _reset(
    path: string[],
    newStateMap: Map<string, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._getStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, undefined);

    return createRouteOperation(this, targetEntry, () => {
      const activeEntrySet = this._activeEntrySet;

      runInAction(() => {
        activeEntrySet.replace([targetEntry]);
      });
    });
  }

  _push(
    path: string[],
    newStateMap: Map<string, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._requireStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry);

    return createRouteOperation(this, targetEntry, obsoleteEntries => {
      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.delete(activeEntry);

      for (const entry of obsoleteEntries) {
        activeEntrySet.delete(entry);
      }

      activeEntrySet.add(targetEntry);
    });
  }

  _replace(
    path: string[],
    newStateMap: Map<string, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._requireStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry.previous);

    return createRouteOperation(this, targetEntry, obsoleteEntries => {
      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.delete(activeEntry);

      for (const entry of obsoleteEntries) {
        activeEntrySet.delete(entry);
      }

      activeEntrySet.add(targetEntry);
    });
  }

  _transition(
    targetEntry: ViewEntry,
    newStatePart: object,
    transitionState: unknown,
    setter: RouteOperationSetter,
  ): Transition<unknown> {
    const {id, path, stateMap, previous} = targetEntry;

    const observableTransitionState = observable.box(
      transitionState ?? this._views.$transition,
    );

    const transitionEntry = this._buildEntry(path, stateMap, previous, {
      id,
      newStatePart,
      observableState: observableTransitionState,
    });

    runInAction(() => {
      this._activeEntrySet.add(transitionEntry);
    });

    return createTransition(
      targetEntry,
      transitionEntry,
      newStatePart,
      observableTransitionState,
      setter,
      () => {
        runInAction(() => {
          this._activeEntrySet.delete(transitionEntry);
        });
      },
    );
  }

  _getActiveEntries(path: string[]): ViewEntry[] {
    return Array.from(this._activeEntrySet).filter(
      entry =>
        getCommonStartOfTwoArray(entry.path, path).length === path.length,
    );
  }

  private _requireStableActiveViewEntry(): ViewEntry {
    const entry = this._getStableActiveViewEntry();

    if (!entry) {
      throw new Error('No stable active view entry');
    }

    return entry;
  }

  private _getStableActiveViewEntry(): ViewEntry | undefined {
    for (const entry of this._activeEntrySet) {
      if (entry.transition) {
        continue;
      }

      return entry;
    }

    return undefined;
  }

  private _buildEntry(
    path: string[],
    observableStateMap: Map<string, object>,
    previous: ViewEntry | undefined,
    transition?:
      | {
          id: number;
          newStatePart: object;
          observableState: IObservableValue<unknown>;
        }
      | undefined,
  ): ViewEntry {
    const id = transition?.id ?? ++RouterClass_.lastViewEntryId;

    const lastKey = _.last(path)!;

    const viewComputedValues: IComputedValue<object>[] = [];

    const observableStates: object[] = [];

    let upperViews = this._views;

    for (const key of path) {
      observableStates.unshift(observableStateMap.get(key)!);

      const exact = key === lastKey;

      const orderedObservableStatesToKey = [
        {
          get $id(): number {
            return id;
          },
          get $exact(): boolean {
            return exact;
          },
          get $transition(): unknown {
            return transition?.observableState.get();
          },
        },
        ...(transition ? [transition.newStatePart] : []),
        ...observableStates,
      ];

      const mergedObservableState = createMergedObjectProxy(
        orderedObservableStatesToKey,
      );

      const views = upperViews[key] ?? {};

      const viewBuilderOption = views.$view ?? [];

      const viewBuilders = (
        Array.isArray(viewBuilderOption)
          ? viewBuilderOption
          : [viewBuilderOption]
      )
        .map((viewBuilder): FunctionViewBuilder__ => {
          if (
            // class has prototype writable false
            Object.getOwnPropertyDescriptor(viewBuilder as any, 'prototype')
              ?.writable === false
          ) {
            const ViewConstructor = viewBuilder as ClassViewBuilder__;
            return state => new ViewConstructor(state);
          } else {
            return viewBuilder as FunctionViewBuilder__;
          }
        })
        .reverse();

      const mergedViewComputedValue = computed(() => {
        if (viewBuilders.length === 0) {
          return mergedObservableState;
        }

        const views = viewBuilders.map(viewBuilder =>
          viewBuilder(mergedObservableState),
        );

        return createMergedObjectProxy([
          ...views,
          ...orderedObservableStatesToKey,
        ]);
      });

      viewComputedValues.push(mergedViewComputedValue);

      upperViews = views;
    }

    const entry: ViewEntry = {
      id,
      path,
      stateMap: observableStateMap,
      viewComputedValues,
      previous,
      transition: transition !== undefined,
    };

    return entry;
  }

  private _buildStateMap(
    path: string[],
    newStateMap: Map<string, object>,
    activeEntry: ViewEntry | undefined,
  ): Map<string, object> {
    const {path: activePath, stateMap: activeStateMap} = activeEntry ?? {
      path: [],
      stateMap: new Map<string, object>(),
    };

    const stateMap = new Map<string, object>();

    const commonStartKeys = getCommonStartOfTwoArray(path, activePath);

    let upperSchemas = this._schemas;

    for (const key of commonStartKeys) {
      const state = newStateMap.get(key);

      stateMap.set(key, state ? observable(state) : activeStateMap.get(key)!);

      const schemas = upperSchemas[key];

      upperSchemas = typeof schemas === 'object' ? schemas : {};
    }

    for (const key of path.slice(commonStartKeys.length)) {
      let schemas = upperSchemas[key];

      if (schemas === true) {
        schemas = {};
      }

      const state =
        newStateMap.get(key) ?? ('$state' in schemas ? schemas.$state : {});

      if (!state) {
        throw new Error(
          `State ${JSON.stringify(
            key,
          )} is missing and no default value is provided`,
        );
      }

      stateMap.set(key, observable(state));

      upperSchemas = schemas;
    }

    return stateMap;
  }

  static lastViewEntryId = 0;
}

export interface RouterConstructor {
  new <
    TSchemaRecord extends SchemaRecord,
    TRootViewDefinitionRecord extends RootViewDefinitionRecord_<TSchemaRecord>,
  >(
    schemas: TSchemaRecord,
    views?: TRootViewDefinitionRecord,
  ): RouterType_<TSchemaRecord, TRootViewDefinitionRecord>;
  lastViewEntryId: number;
}

export const Router = RouterClass_ as RouterConstructor;

export type Router<
  TSchemaRecord extends SchemaRecord__,
  TRootViewDefinitionRecord extends RootViewDefinitionRecord_<TSchemaRecord>,
> = RouterType_<TSchemaRecord, TRootViewDefinitionRecord>;

export type Router__ = RouterClass_<SchemaRecord__, object, unknown>;

type RouterType_<TSchemaRecord, TRootViewDefinitionRecord> = [
  Exclude<
    Exclude<keyof TRootViewDefinitionRecord, `$${string}`>,
    keyof TSchemaRecord
  >,
  TransitionState_<TRootViewDefinitionRecord>,
] extends [infer TExtraViewKey extends string, infer TTransitionState]
  ? [TExtraViewKey] extends [never]
    ? RouterClass_<
        TSchemaRecord,
        TRootViewDefinitionRecord,
        TTransitionState
      > & {
        [TKey in Extract<keyof TSchemaRecord, string>]: RouteType_<
          TSchemaRecord[TKey] extends infer TSchema extends object
            ? TSchema
            : {},
          TRootViewDefinitionRecord extends Record<TKey, object>
            ? TRootViewDefinitionRecord[TKey]
            : {},
          {},
          [TKey],
          TTransitionState
        >;
      }
    : {TypeError: `Unexpected view key "${TExtraViewKey}"`}
  : never;

type TransitionState_<TRootViewDefinitionRecord> =
  TRootViewDefinitionRecord extends {
    $transition: infer TransitionState;
  }
    ? TransitionState
    : undefined;
