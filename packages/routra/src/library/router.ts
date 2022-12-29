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
import type {SchemaRecord__} from './schema';
import type {Transition} from './transition';
import {createTransition} from './transition';
import type {
  ClassViewBuilder__,
  FunctionViewBuilder__,
  RootViewDefinitionRecord__,
  ViewEntry,
} from './view';

export class Router_<
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

    return createRouteBack(this, targetEntry, () => {
      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.delete(activeEntry);

      targetEntry.afterTransition = undefined;

      activeEntrySet.add(targetEntry);
    });
  }

  get $ableToBack(): boolean {
    return this._getStableActiveViewEntry()?.previous !== undefined;
  }

  _reset(
    path: string[],
    newStateMap: Map<number, object>,
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
    newStateMap: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._requireStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry);

    return createRouteOperation(this, targetEntry, () => {
      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.delete(activeEntry);

      activeEntrySet.add(targetEntry);
    });
  }

  _replace(
    path: string[],
    newStateMap: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._requireStableActiveViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry.previous);

    return createRouteOperation(this, targetEntry, () => {
      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.delete(activeEntry);

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
      () => {
        setter();
        targetEntry.afterTransition = observableTransitionState.get();
        this._activeEntrySet.delete(transitionEntry);
      },
      () => {
        this._activeEntrySet.delete(transitionEntry);
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
    const id = transition?.id ?? ++Router_.lastViewEntryId;

    const viewComputedValues: IComputedValue<object>[] = [];

    const sharedMetadata = {
      get $id(): number {
        return id;
      },
      get $path(): string[] {
        return path;
      },
      get $transition(): unknown {
        return transition?.observableState.get();
      },
      get $afterTransition(): unknown {
        return entry.afterTransition;
      },
    };

    const observableStates: object[] = [];

    let upperViews = this._views;

    const exactIndex = path.length - 1;

    for (const [index, key] of path.entries()) {
      observableStates.unshift(observableStateMap.get(key)!);

      const orderedObservableStatesToKey = [
        sharedMetadata,
        {
          get $exact(): boolean {
            return index === exactIndex;
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

      const builtViewComputedValues = viewBuilders.map(viewBuilder =>
        computed(() => viewBuilder(mergedObservableState)),
      );

      const mergedViewComputedValue = computed(() => {
        if (builtViewComputedValues.length === 0) {
          return mergedObservableState;
        }

        const views = builtViewComputedValues.map(computedValue =>
          computedValue.get(),
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
      afterTransition: undefined,
    };

    return entry;
  }

  private _buildStateMap(
    path: string[],
    newStateMap: Map<number, object>,
    activeEntry: ViewEntry | undefined,
  ): Map<string, object> {
    const {path: activePath, stateMap: activeStateMap} = activeEntry ?? {
      path: [],
      stateMap: new Map<string, object>(),
    };

    const stateMap = new Map<string, object>();

    const commonStartKeys = getCommonStartOfTwoArray(path, activePath);

    let upperSchemas = this._schemas;

    for (const [index, key] of commonStartKeys.entries()) {
      const state = newStateMap.get(index);

      stateMap.set(key, state ? observable(state) : activeStateMap.get(key)!);

      const schemas = upperSchemas[key];

      upperSchemas = typeof schemas === 'object' ? schemas : {};
    }

    for (const [index, key] of path.slice(commonStartKeys.length).entries()) {
      let schemas = upperSchemas[key];

      if (schemas === true) {
        schemas = {};
      }

      const state =
        newStateMap.get(commonStartKeys.length + index) ??
        ('$state' in schemas ? schemas.$state : {});

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

export type Router__ = Router_<SchemaRecord__, object, unknown>;

export type RouterType_<TSchemaRecord, TRootViewDefinitionRecord> = Exclude<
  Exclude<keyof TRootViewDefinitionRecord, `$${string}`>,
  keyof TSchemaRecord
> extends infer TExtraViewKey extends string
  ? [TExtraViewKey] extends [never]
    ? TransitionState_<TRootViewDefinitionRecord> extends infer TTransitionState
      ? Router_<TSchemaRecord, TRootViewDefinitionRecord, TTransitionState> & {
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
      : never
    : {TypeError: `Unexpected view key "${TExtraViewKey}"`}
  : never;

type TransitionState_<TRootViewDefinitionRecord> =
  TRootViewDefinitionRecord extends {
    $transition: infer TransitionState;
  }
    ? TransitionState
    : undefined;
