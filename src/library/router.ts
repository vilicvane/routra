import _ from 'lodash';
import type {IComputedValue} from 'mobx';
import {computed, makeObservable, observable, runInAction} from 'mobx';

import type {__ViewEntry} from './@state';
import {createMergedObjectProxy, getCommonStartOfTwoArray} from './@utils';
import {PreviousRoute} from './previous-route';
import type {_PreviousTransition} from './previous-transition';
import {_createPreviousTransition} from './previous-transition';
import type {_RouteType} from './route';
import {_createRoute} from './route';
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
    makeObservable(this);

    for (let [key, schema] of Object.entries(_schemas)) {
      if (schema === true) {
        schema = {};
      }

      (this as any)[key] = _createRoute(this as any, schema, [key], new Map());
    }
  }

  @computed
  get $previous(): PreviousRoute<TTransitionState> | undefined {
    const activeEntry = this._getStableActiveViewEntry();

    const previousEntry = activeEntry?.previous;

    return previousEntry ? new PreviousRoute(this, previousEntry) : undefined;
  }

  _reset(
    {path, newStateMap, newStatePart}: RouteTarget,
    activeEntry: __ViewEntry | undefined,
  ): void {
    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const entry = this._buildEntry(path, stateMap, undefined);

    runInAction(() => {
      updateStateMapByPart(path, stateMap, newStatePart);

      const activeEntrySet = this._activeEntrySet;

      activeEntrySet.clear();
      activeEntrySet.add(entry);
    });
  }

  _push(
    {path, newStateMap, newStatePart}: RouteTarget,
    activeEntry: __ViewEntry,
    transitionEntry?: __ViewEntry,
  ): void {
    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const entry = this._buildEntry(path, stateMap, activeEntry);

    runInAction(() => {
      updateStateMapByPart(path, stateMap, newStatePart);

      const activeEntrySet = this._activeEntrySet;

      if (transitionEntry) {
        activeEntrySet.delete(transitionEntry);
      }

      activeEntrySet.delete(activeEntry);
      activeEntrySet.add(entry);
    });
  }

  _replace(
    {path, newStateMap, newStatePart}: RouteTarget,
    activeEntry: __ViewEntry,
    transitionEntry?: __ViewEntry,
  ): void {
    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const entry = this._buildEntry(path, stateMap, activeEntry.previous);

    runInAction(() => {
      updateStateMapByPart(path, stateMap, newStatePart);

      const activeEntrySet = this._activeEntrySet;

      if (transitionEntry) {
        activeEntrySet.delete(transitionEntry);
      }

      activeEntrySet.delete(activeEntry);
      activeEntrySet.add(entry);
    });
  }

  _back(activeEntry: __ViewEntry, transitionEntry?: __ViewEntry): void {
    const previousEntry = activeEntry.previous;

    if (!previousEntry) {
      return;
    }

    runInAction(() => {
      const activeEntrySet = this._activeEntrySet;

      if (transitionEntry) {
        activeEntrySet.delete(transitionEntry);
      }

      activeEntrySet.delete(activeEntry);
      activeEntrySet.add(previousEntry!);
    });
  }

  _transition(
    {path, newStateMap, newStatePart}: RouteTarget,
    activeEntry: __ViewEntry,
    transitionState = this._views.$transition,
  ): _Transition<unknown> {
    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);

    const transitionEntry = this._buildEntry(
      path,
      stateMap,
      undefined,
      newStatePart,
      transitionState,
    );

    runInAction(() => {
      this._activeEntrySet.add(transitionEntry);
    });

    return _createTransition(this, activeEntry, transitionEntry, newStateMap);
  }

  _previousTransition(
    activeEntry: __ViewEntry,
    transitionState = this._views.$transition,
  ): _PreviousTransition<unknown> {
    const previousEntry = activeEntry.previous;

    if (!previousEntry) {
      throw new Error('No previous entry');
    }

    const transitionEntry: __ViewEntry = {
      ...previousEntry,
      transition: {
        newStatePart: {},
        observableState: observable.box(transitionState),
      },
    };

    runInAction(() => {
      this._activeEntrySet.add(transitionEntry);
    });

    return _createPreviousTransition(this, activeEntry, transitionEntry);
  }

  _abortTransition(transitionEntry: __ViewEntry): void {
    runInAction(() => {
      this._activeEntrySet.delete(transitionEntry);
    });
  }

  _getActiveEntries(path: string[]): __ViewEntry[] {
    return Array.from(this._activeEntrySet).filter(
      entry =>
        getCommonStartOfTwoArray(entry.path, path).length === path.length,
    );
  }

  _requireStableActiveViewEntry(): __ViewEntry {
    const entry = this._getStableActiveViewEntry();

    if (!entry) {
      throw new Error('No stable active view entry');
    }

    return entry;
  }

  _getStableActiveViewEntry(): __ViewEntry | undefined {
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
    transitionNewStatePart?: object,
    transitionState?: unknown,
  ): __ViewEntry {
    const lastKey = _.last(path)!;

    const viewComputedValueMap = new Map<string, IComputedValue<object>>();

    const observableStates: object[] = [];

    let upperViews = this._views;

    for (const key of path) {
      observableStates.unshift(observableStateMap.get(key)!);

      const exact = key === lastKey;

      const orderedObservableStatesToKey = [
        {
          get $exact(): boolean {
            return exact;
          },
          get $transition(): unknown {
            return entry.transition?.observableState.get();
          },
        },
        ...(transitionNewStatePart ? [transitionNewStatePart] : []),
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

      viewComputedValueMap.set(key, mergedViewComputedValue);

      upperViews = views;
    }

    const entry: __ViewEntry = {
      path,
      stateMap: observableStateMap,
      viewComputedValueMap,
      previous,
      transition: transitionNewStatePart
        ? {
            newStatePart: transitionNewStatePart,
            observableState: observable.box(transitionState),
          }
        : undefined,
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
}

function updateStateMapByPart(
  path: string[],
  observableStateMap: Map<string, object>,
  statePart: object,
): void {
  const observableStateEntries = path
    .map((key): [string, object] => [key, observableStateMap.get(key)!])
    .reverse();

  statePartKeyValue: for (const [statePartKey, value] of Object.entries(
    statePart,
  )) {
    for (const [pathKey, observableState] of observableStateEntries) {
      if (statePartKey in observableState) {
        if (Reflect.set(observableState, statePartKey, value)) {
          continue statePartKeyValue;
        } else {
          throw new Error(
            `Failed to update value of ${JSON.stringify(
              statePartKey,
            )} in ${JSON.stringify(pathKey)}`,
          );
        }
      }
    }

    throw new Error(
      `Failed to find value of ${JSON.stringify(statePartKey)} to update`,
    );
  }
}

interface RouteTarget {
  path: string[];
  newStateMap: Map<string, object>;
  newStatePart: object;
}

export type RouterConstructor = new <
  TSchemaRecord extends SchemaRecord,
  TRootViewDefinitionRecord extends _RootViewDefinitionRecord<TSchemaRecord>,
>(
  schemas: TSchemaRecord,
  views?: TRootViewDefinitionRecord,
) => _RouterType<TSchemaRecord, TRootViewDefinitionRecord>;

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
