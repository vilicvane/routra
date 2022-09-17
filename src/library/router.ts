import _ from 'lodash';
import type {IComputedValue, IObservableValue} from 'mobx';
import {computed, observable, runInAction} from 'mobx';

import type {__ViewEntry} from './@state';
import {createMergedObjectProxy, getCommonStartOfTwoArray} from './@utils';
import type {_RouteType} from './route';
import {_createRoute} from './route';
import type {
  RouteOperationSetter,
  _RouteBack,
  _RouteOperation,
} from './route-operation';
import {_createRouteBack, _createRouteOperation} from './route-operation';
import type {SchemaRecord, __SchemaRecord} from './schema';
import type {_Transition} from './transition';
import {_createTransition} from './transition';
import type {
  _RootViewDefinitionRecord,
  __RootViewDefinitionRecord,
} from './view';

export class _RouterClass<
  TSchemaRecord,
  TRootViewDefinitionRecord,
  TTransitionState,
> {
  private _activeEntrySet = observable.set<__ViewEntry>([], {
    deep: false,
  });

  constructor(schemas: TSchemaRecord, views?: TRootViewDefinitionRecord);
  constructor(
    private _schemas: __SchemaRecord,
    private _views: __RootViewDefinitionRecord = {},
  ) {
    for (let [key, schema] of Object.entries(_schemas)) {
      if (schema === true) {
        schema = {};
      }

      (this as any)[key] = _createRoute(this as any, schema, [key], new Map());
    }
  }

  get $back(): _RouteBack<TTransitionState> {
    const activeEntry = this._requireStableActiveViewEntry();

    const targetEntry = activeEntry.previous;

    if (!targetEntry) {
      throw new Error('No previous entry');
    }

    return _createRouteBack(this, targetEntry, obsoleteEntries => {
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
  ): _RouteOperation<unknown, unknown> {
    const activeEntry = this._getStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, undefined);

    return _createRouteOperation(this, targetEntry, () => {
      const activeEntrySet = this._activeEntrySet;

      runInAction(() => {
        activeEntrySet.replace([targetEntry]);
      });
    });
  }

  _push(
    path: string[],
    newStateMap: Map<string, object>,
  ): _RouteOperation<unknown, unknown> {
    const activeEntry = this._requireStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry);

    return _createRouteOperation(this, targetEntry, obsoleteEntries => {
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
  ): _RouteOperation<unknown, unknown> {
    const activeEntry = this._requireStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry.previous);

    return _createRouteOperation(this, targetEntry, obsoleteEntries => {
      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.delete(activeEntry);

      for (const entry of obsoleteEntries) {
        activeEntrySet.delete(entry);
      }

      activeEntrySet.add(targetEntry);
    });
  }

  _transition(
    targetEntry: __ViewEntry,
    newStatePart: object,
    transitionState: unknown,
    setter: RouteOperationSetter,
  ): _Transition<unknown> {
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

    return _createTransition(
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

  _getActiveEntries(path: string[]): __ViewEntry[] {
    return Array.from(this._activeEntrySet).filter(
      entry =>
        getCommonStartOfTwoArray(entry.path, path).length === path.length,
    );
  }

  private _requireStableActiveViewEntry(): __ViewEntry {
    const entry = this._getStableActiveViewEntry();

    if (!entry) {
      throw new Error('No stable active view entry');
    }

    return entry;
  }

  private _getStableActiveViewEntry(): __ViewEntry | undefined {
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
    previous: __ViewEntry | undefined,
    transition?:
      | {
          id: number;
          newStatePart: object;
          observableState: IObservableValue<unknown>;
        }
      | undefined,
  ): __ViewEntry {
    const id = transition?.id ?? ++_RouterClass.lastViewEntryId;

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

      let viewBuilder = views.$view;

      if (
        viewBuilder &&
        // class has prototype writable false
        Object.getOwnPropertyDescriptor(viewBuilder as any, 'prototype')
          ?.writable === false
      ) {
        const ViewConstructor = viewBuilder as any;
        viewBuilder = state => new ViewConstructor(state);
      }

      const mergedViewComputedValue = computed(() => {
        if (!viewBuilder) {
          return mergedObservableState;
        }

        const view = (viewBuilder as any)(mergedObservableState);

        return createMergedObjectProxy([view, ...orderedObservableStatesToKey]);
      });

      viewComputedValues.push(mergedViewComputedValue);

      upperViews = views;
    }

    const entry: __ViewEntry = {
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
    activeEntry: __ViewEntry | undefined,
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
    TRootViewDefinitionRecord extends _RootViewDefinitionRecord<TSchemaRecord>,
  >(
    schemas: TSchemaRecord,
    views?: TRootViewDefinitionRecord,
  ): _RouterType<TSchemaRecord, TRootViewDefinitionRecord>;
  lastViewEntryId: number;
}

export const Router = _RouterClass as RouterConstructor;

export type Router<
  TSchemaRecord extends __SchemaRecord,
  TRootViewDefinitionRecord extends _RootViewDefinitionRecord<TSchemaRecord>,
> = _RouterType<TSchemaRecord, TRootViewDefinitionRecord>;

export type __Router = _RouterClass<__SchemaRecord, object, unknown>;

type _RouterType<TSchemaRecord, TRootViewDefinitionRecord> = [
  Exclude<
    Exclude<keyof TRootViewDefinitionRecord, `$${string}`>,
    keyof TSchemaRecord
  >,
  _TransitionState<TRootViewDefinitionRecord>,
] extends [infer TExtraViewKey extends string, infer TTransitionState]
  ? [TExtraViewKey] extends [never]
    ? _RouterClass<
        TSchemaRecord,
        TRootViewDefinitionRecord,
        TTransitionState
      > & {
        [TKey in Extract<keyof TSchemaRecord, string>]: _RouteType<
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

type _TransitionState<TRootViewDefinitionRecord> =
  TRootViewDefinitionRecord extends {
    $transition: infer TransitionState;
  }
    ? TransitionState
    : undefined;
