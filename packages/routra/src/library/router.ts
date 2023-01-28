import type {IObservableValue} from 'mobx';
import {observable, runInAction} from 'mobx';

import {getCommonStartOfTwoArray} from './@utils';
import type {RouteEntry} from './route';
import type {RouteOperation_} from './route-operation';
import {createRouteOperation} from './route-operation';
import type {Schema} from './schema';

export class Router_ {
  @observable.ref
  private _active: RouteEntry | undefined;

  @observable.ref
  private _transition: TransitionEntry | undefined;

  private readonly _queue: RouteTarget[] = [];

  constructor(private _schema: Schema) {}

  _reset(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const stateMap = buildStateMap(
      path,
      stateMapUpdate,
      this._active,
      this._schema,
    );

    return createRouteOperation(this, {
      path,
      stateMap,
      previous: undefined,
    });
  }

  _push(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const active = this._requireActiveRouteEntry();

    const stateMap = buildStateMap(path, stateMapUpdate, active, this._schema);

    return createRouteOperation(this, {
      path,
      stateMap,
      previous: active,
    });
  }

  _replace(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const active = this._requireActiveRouteEntry();

    const stateMap = buildStateMap(path, stateMapUpdate, active, this._schema);

    return createRouteOperation(this, {
      path,
      stateMap,
      previous: active.previous,
    });
  }

  /**
   * @internal
   */
  _set(target: RouteTarget): void {
    this._startTransition(target);
  }

  /**
   * @internal
   */
  _requireActiveRouteEntry(): RouteEntry {
    const entry = this._active;

    if (!entry) {
      throw new Error('No active route entry');
    }

    return entry;
  }

  private _startTransition(target: RouteTarget): void {
    if (this._transition) {
      this._queue.push(target);
      return;
    }

    const finish = (): void => {};

    const transition = {
      controlled: false,
      entering: false,
      entry: {
        ...target,
        entering: 0,
        leaving: 0,
      },
    } satisfies TransitionEntry;

    runInAction(() => {
      this._transition = transition;
    });

    setTimeout(() => {
      if (transition.entering) {
        // Managed by view.
        return;
      }

      this._finishTransition();
    });
  }

  private _finishTransition(): void {
    const transition = this._transition;

    if (!transition) {
      return;
    }

    runInAction(() => {
      this._active = transition.entry;

      this._transition = undefined;

      const next = this._queue.shift();

      if (next) {
        this._startTransition(next);
      }
    });
  }
}

export type Router__ = Router_;

function buildEntry(
  path: string[],
  observableStateMap: Map<string, object>,
  previous: RouteEntry | undefined,
): RouteEntry {
  const mergedViews: object[] = [];

  const shared = {
    get $path(): string[] {
      return path;
    },
  };

  const observableStates: object[] = [];

  const exactIndex = path.length - 1;

  for (const [index, key] of path.entries()) {
    observableStates.unshift(observableStateMap.get(key)!);

    const orderedObservableStatesToKey = [
      shared,
      {
        get $exact(): boolean {
          return index === exactIndex;
        },
        get $entering(): unknown {},
        get $leaving(): unknown {},
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
      Array.isArray(viewBuilderOption) ? viewBuilderOption : [viewBuilderOption]
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

    const mergedViewComputedValue = createMergedObjectProxy(() => {
      if (builtViewComputedValues.length === 0) {
        return [mergedObservableState];
      }

      const views = builtViewComputedValues.map(computedValue =>
        computedValue.get(),
      );

      return [...views, ...orderedObservableStatesToKey];
    });

    mergedViews.push(mergedViewComputedValue);

    upperViews = views;
  }

  const entry: ViewEntry = {
    id,
    path,
    stateMap: observableStateMap,
    mergedViews,
    previous,
    enteringSet: observable.set(),
    leavingSet: observable.set(),
  };

  return entry;
}

function buildStateMap(
  path: string[],
  stateMapUpdate: Map<number, object>,
  active: RouteEntry | undefined,
  schema: Schema,
): Map<number, object> {
  const {path: activePath, stateMap: activeStateMap} = active ?? {
    path: [],
    stateMap: new Map<number, object>(),
  };

  const stateMap = new Map<number, object>();

  const commonStartKeys = getCommonStartOfTwoArray(path, activePath);

  let upperSchemas = schema.$children ?? {};

  for (const [index, key] of commonStartKeys.entries()) {
    const state = stateMapUpdate.get(index);

    stateMap.set(index, state ? state : activeStateMap.get(index)!);

    const schema = upperSchemas[key];

    upperSchemas = typeof schema === 'object' ? schema.$children ?? {} : {};
  }

  for (const [index, key] of path.slice(commonStartKeys.length).entries()) {
    let schema = upperSchemas[key];

    if (schema === true) {
      schema = {};
    }

    const stateIndex = commonStartKeys.length + index;

    const state =
      stateMapUpdate.get(stateIndex) ??
      ('$state' in schema ? schema.$state : {});

    if (!state) {
      throw new Error(
        `State ${JSON.stringify(
          key,
        )} is missing and no default value is provided`,
      );
    }

    stateMap.set(stateIndex, state);

    upperSchemas = schema.$children ?? {};
  }

  return stateMap;
}

type TransitionEntry =
  | {
      controlled: true;
      transitionStateObservable: IObservableValue<unknown>;
      entry: RouteEntry;
    }
  | {
      controlled: false;
      /**
       * True indicates entering being managed by view.
       */
      entering: boolean;
      entry: RouteEntry;
    };

export interface RouteTarget {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteEntry | undefined;
}
