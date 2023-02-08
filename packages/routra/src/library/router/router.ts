import type {IObservableValue} from 'mobx';
import {makeObservable, observable, runInAction, when} from 'mobx';

import type {ChildSchemaFallback_} from '../@schema';
import {getCommonStartOfTwoArray} from '../@utils';
import type {
  RouteOperation__,
  RouteSwitching,
  RouteSwitching__,
  RouteTarget,
  RouteType_,
} from '../route';
import {
  RouteEntry,
  createRoute,
  createRouteOperation,
  createRouteSwitching,
} from '../route';
import type {RouteKey, Schema, SchemaRecord} from '../schema';

import type {RouterBack} from './router-back';
import {createRouterBack} from './router-back';

export interface RouterOptions<TSwitchingState extends object> {
  defaultSwitchingState?: TSwitchingState;
}

export class RouterClass<TSwitchingState extends object> {
  /** @internal */
  @observable.ref
  _active: ActiveEntry | undefined;

  /** @internal */
  @observable.ref
  _transition: TransitionEntry | undefined;

  /** @internal */
  @observable.ref
  _switching: SwitchingEntry | undefined;

  private readonly _queue: [RouteTarget, () => void][] = [];

  constructor(
    private _schemas: SchemaRecord,
    private _options: RouterOptions<TSwitchingState>,
  ) {
    makeObservable(this);

    for (let [key, childSchema] of Object.entries(_schemas)) {
      if (key.startsWith('$')) {
        continue;
      }

      if (childSchema === true) {
        childSchema = {};
      }

      (this as any)[key] = createRoute(
        this,
        childSchema as Schema,
        [key],
        new Map(),
      );
    }
  }

  get $back(): RouterBack<TSwitchingState> {
    const {
      entry: {previous: entry},
    } = this._requireActive();

    if (!entry) {
      throw new Error('No previous entry');
    }

    return createRouterBack(this, entry);
  }

  get $ableToBack(): boolean {
    return this._active?.entry.previous !== undefined;
  }

  /** @internal */
  _reset(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation__ {
    const stateMap = buildStateMap(
      path,
      stateMapUpdate,
      this._active?.entry,
      this._schemas,
    );

    return createRouteOperation(this, 'reset', {
      path,
      stateMap,
      previous: undefined,
    });
  }

  /** @internal */
  _push(path: string[], stateMapUpdate: Map<number, object>): RouteOperation__ {
    const {entry} = this._requireActive();

    const stateMap = buildStateMap(path, stateMapUpdate, entry, this._schemas);

    return createRouteOperation(this, 'push', {
      path,
      stateMap,
      previous: entry.target,
    });
  }

  /** @internal */
  _replace(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation__ {
    const {entry} = this._requireActive();

    const stateMap = buildStateMap(path, stateMapUpdate, entry, this._schemas);

    return createRouteOperation(this, 'replace', {
      path,
      stateMap,
      previous: entry.previous,
    });
  }

  /** @internal */
  _switch(
    operation: RouterOperation,
    {path, stateMap, previous}: RouteTarget,
    switchingState: object | undefined,
  ): RouteSwitching__ {
    const ref = {};

    if (switchingState === undefined) {
      switchingState = this._options.defaultSwitchingState;

      if (switchingState === undefined) {
        throw new Error(
          'Switching state is required as no default is provided',
        );
      }
    }

    const switchingStateObservable = observable.box(switchingState);

    const entry = new RouteEntry(this, path, stateMap, previous);

    runInAction(() => {
      this._switching = {
        operation,
        entry,
        switchingStateObservable,
        ref,
      };
    });

    return createRouteSwitching(this, switchingStateObservable, ref);
  }

  /** @internal */
  _completeSwitching(ref: object): void {
    const {operation, entry} = this._requireSwitching(ref);

    runInAction(() => {
      this._active = {
        operation,
        entry,
      };

      this._switching = undefined;
    });
  }

  /** @internal */
  _abortSwitching(ref: object): void {
    this._requireSwitching(ref);

    runInAction(() => {
      this._switching = undefined;
    });
  }

  /** @internal */
  _set(operation: RouterOperation, target: RouteTarget): RouterSetResult {
    return {
      $completed: new Promise<void>(resolve =>
        this._startTransition(operation, target, resolve),
      ),
    };
  }

  /** @internal */
  _requireActive(): ActiveEntry {
    const active = this._active;

    if (!active) {
      throw new Error('No active entry');
    }

    return active;
  }

  /** @internal */
  _requireTransition(): TransitionEntry {
    const transition = this._transition;

    if (!transition) {
      throw new Error('No transition entry');
    }

    return transition;
  }

  /** @internal */
  _requireSwitching(ref: object): SwitchingEntry {
    const switching = this._switching;

    if (!switching) {
      throw new Error('No switching entry');
    }

    if (ref !== switching.ref) {
      throw new Error('Switching does not match');
    }

    return switching;
  }

  private _startTransition(
    operation: RouterOperation,
    target: RouteTarget,
    complete: () => void,
  ): void {
    if (this._transition) {
      this._queue.push([target, complete]);
      return;
    }

    const activeRouteEntry = this._active?.entry;

    const transitionRouteEntry = new RouteEntry(
      this,
      target.path,
      target.stateMap,
      target.previous,
    );

    runInAction(() => {
      this._transition = {
        operation,
        entry: transitionRouteEntry,
      };
    });

    // Wait initial render to register transition.
    void Promise.resolve()
      .then(() =>
        when(
          () =>
            (!activeRouteEntry || !activeRouteEntry.blockedByLeaving) &&
            !transitionRouteEntry.blockedByEntering,
        ),
      )
      .then(() => {
        this._finishTransition();
        complete();
      });
  }

  private _finishTransition(): void {
    const {operation, entry} = this._requireTransition();

    runInAction(() => {
      this._active = {
        operation,
        entry,
      };

      this._transition = undefined;

      const next = this._queue.shift();

      if (next) {
        const [target, complete] = next;

        this._startTransition(operation, target, complete);
      }
    });
  }
}

export type Router__ = RouterClass<object>;

function buildStateMap(
  path: string[],
  stateMapUpdate: Map<number, object>,
  active: RouteEntry | undefined,
  schemas: SchemaRecord,
): Map<number, object> {
  const {path: activePath, stateMap: activeStateMap} = active ?? {
    path: [],
    stateMap: new Map<number, object>(),
  };

  const stateMap = new Map<number, object>();

  const commonStartKeys = getCommonStartOfTwoArray(
    path,
    activePath,
  ) as RouteKey[];

  let upperSchemas = schemas;

  for (const [index, key] of commonStartKeys.entries()) {
    const state = stateMapUpdate.get(index);

    stateMap.set(index, state ? observable(state) : activeStateMap.get(index)!);

    const schema = upperSchemas[key];

    upperSchemas = typeof schema === 'object' ? schema : {};
  }

  for (const [index, key] of (path as RouteKey[])
    .slice(commonStartKeys.length)
    .entries()) {
    let schema = upperSchemas[key];

    if (schema === true) {
      schema = {};
    }

    const stateIndex = commonStartKeys.length + index;

    let state = stateMapUpdate.get(stateIndex);

    if (state === undefined) {
      if ('$state' in schema) {
        state = schema.$state;

        if (typeof state === 'function') {
          state = state();
        }
      } else {
        state = {};
      }
    }

    if (state === undefined) {
      throw new Error(
        `State ${JSON.stringify(
          key,
        )} is missing and no default value is provided`,
      );
    }

    stateMap.set(stateIndex, observable(state));

    upperSchemas = schema;
  }

  return stateMap;
}

export type RouterOperation = 'reset' | 'push' | 'replace' | 'back';

export interface ActiveEntry {
  operation: RouterOperation;
  entry: RouteEntry;
}

export interface TransitionEntry {
  operation: RouterOperation;
  entry: RouteEntry;
}

export interface SwitchingEntry {
  operation: RouterOperation;
  entry: RouteEntry;
  switchingStateObservable: IObservableValue<object>;
  ref: object;
}

export type MatchEntry = ActiveEntry | TransitionEntry | SwitchingEntry;

export interface RouterSetResult {
  $completed: Promise<void>;
}

export type Router<
  TSchemaRecord extends SchemaRecord,
  TSwitchingState extends object,
> = RouterClass<TSwitchingState> & {
  [TKey in Extract<keyof TSchemaRecord, RouteKey>]: RouteType_<
    ChildSchemaFallback_<TSchemaRecord[TKey]>,
    TSwitchingState,
    {},
    [TKey]
  >;
};

export type RouterSwitchingState_<TRouter> = TRouter extends RouterClass<
  infer TSwitchingState
>
  ? TSwitchingState
  : never;

export type RouterSwitchingState<TRouter extends Router__> =
  RouterSwitchingState_<TRouter>;

export type RouterSwitching_<TRouter> = RouteSwitching<
  RouterSwitchingState_<TRouter>
>;

export type RouterSwitching<TRouter extends Router__> =
  RouterSwitching_<TRouter>;
