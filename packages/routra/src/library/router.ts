import type {IObservableValue} from 'mobx';
import {makeObservable, observable, runInAction, when} from 'mobx';

import type {ChildSchemaFallback_, SchemaChildrenType_} from './@schema';
import {getCommonStartOfTwoArray} from './@utils';
import type {
  RouteBack,
  RouteOperation__,
  RouteSwitching,
  RouteSwitching__,
  RouteTarget,
  RouteType_,
} from './route';
import {
  RouteEntry,
  createRoute,
  createRouteBack,
  createRouteOperation,
  createRouteSwitching,
} from './route';
import type {Schema} from './schema';

export interface RouterOptions<TSwitchingState extends object> {
  defaultSwitchingState?: TSwitchingState;
}

export class RouterClass<TSwitchingState extends object> {
  /** @internal */
  @observable.ref
  _active: RouteEntry | undefined;

  /** @internal */
  @observable.ref
  _transition: TransitionEntry | undefined;

  /** @internal */
  @observable.ref
  _switching: SwitchingEntry | undefined;

  private readonly _queue: [RouteTarget, () => void][] = [];

  constructor(
    private _schema: Schema,
    private _options: RouterOptions<TSwitchingState>,
  ) {
    makeObservable(this);

    const {$children} = _schema;

    if ($children) {
      for (let [key, childSchema] of Object.entries($children)) {
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
  }

  get $back(): RouteBack<TSwitchingState> {
    const active = this._requireActiveRouteEntry();

    const target = active.previous;

    if (!target) {
      throw new Error('No previous entry');
    }

    return createRouteBack(this, target);
  }

  get $ableToBack(): boolean {
    return this._active?.previous !== undefined;
  }

  /** @internal */
  _reset(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation__ {
    const stateMap = buildStateMap(
      path,
      stateMapUpdate,
      this._active,
      this._schema,
    );

    return createRouteOperation(this, 'reset', {
      path,
      stateMap,
      previous: undefined,
    });
  }

  /** @internal */
  _push(path: string[], stateMapUpdate: Map<number, object>): RouteOperation__ {
    const active = this._requireActiveRouteEntry();

    const stateMap = buildStateMap(path, stateMapUpdate, active, this._schema);

    return createRouteOperation(this, 'push', {
      path,
      stateMap,
      previous: active.target,
    });
  }

  /** @internal */
  _replace(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation__ {
    const active = this._requireActiveRouteEntry();

    const stateMap = buildStateMap(path, stateMapUpdate, active, this._schema);

    return createRouteOperation(this, 'replace', {
      path,
      stateMap,
      previous: active.previous,
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

    const switching = new RouteEntry(this, path, stateMap, previous);

    runInAction(() => {
      this._switching = {
        operation,
        to: switching,
        switchingStateObservable,
        ref,
      };
    });

    return createRouteSwitching(this, switchingStateObservable, ref);
  }

  /** @internal */
  _completeSwitching(ref: object): void {
    const switching = this._requireSwitching(ref);

    runInAction(() => {
      this._active = switching.to;
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
  _requireActiveRouteEntry(): RouteEntry {
    const entry = this._active;

    if (!entry) {
      throw new Error('No active route entry');
    }

    return entry;
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

    const active = this._active;

    const transition = new RouteEntry(
      this,
      target.path,
      target.stateMap,
      target.previous,
    );

    runInAction(() => {
      this._transition = {
        operation,
        target: transition,
      };
    });

    // Wait initial render to register transition.
    void Promise.resolve()
      .then(() =>
        when(
          () =>
            (!active || !active.blockedByLeaving) &&
            !transition.blockedByEntering,
        ),
      )
      .then(() => {
        this._finishTransition(operation);
        complete();
      });
  }

  private _finishTransition(operation: RouterOperation): void {
    const transition = this._transition;

    if (!transition) {
      throw new Error('Expected transition route entry');
    }

    runInAction(() => {
      this._active = transition.target;

      this._transition = undefined;

      const next = this._queue.shift();

      if (next) {
        const [target, complete] = next;

        this._startTransition(operation, target, complete);
      }
    });
  }

  private _requireSwitching(ref: object): SwitchingEntry {
    const switching = this._switching;

    if (!switching) {
      throw new Error('No switching route entry');
    }

    if (ref !== switching.ref) {
      throw new Error('Switching does not match');
    }

    return switching;
  }
}

export type Router__ = RouterClass<object>;

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

    stateMap.set(
      index,
      state ? Object.freeze(state) : activeStateMap.get(index)!,
    );

    const schema = upperSchemas[key];

    upperSchemas = typeof schema === 'object' ? schema.$children ?? {} : {};
  }

  for (const [index, key] of path.slice(commonStartKeys.length).entries()) {
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

    stateMap.set(stateIndex, Object.freeze(state));

    upperSchemas = schema.$children ?? {};
  }

  return stateMap;
}

export type RouterOperation = 'reset' | 'push' | 'replace' | 'back';

export interface TransitionEntry {
  operation: RouterOperation;
  target: RouteEntry;
}

export interface SwitchingEntry {
  operation: RouterOperation;
  to: RouteEntry;
  switchingStateObservable: IObservableValue<object>;
  ref: object;
}

export interface RouterSetResult {
  $completed: Promise<void>;
}

export type Router<
  TSchema extends Schema,
  TSwitchingState extends object,
> = RouterClass<TSwitchingState> &
  (SchemaChildrenType_<TSchema> extends infer TSchemaRecord
    ? {
        [TKey in Extract<keyof TSchemaRecord, string>]: RouteType_<
          ChildSchemaFallback_<TSchemaRecord[TKey]>,
          TSwitchingState,
          {},
          [TKey]
        >;
      }
    : never);

export type RouterSwitchingState<TRouter extends Router__> =
  TRouter extends RouterClass<infer TSwitchingState> ? TSwitchingState : never;

export type RouterSwitching<TRouter extends Router__> = RouteSwitching<
  RouterSwitchingState<TRouter>
>;
