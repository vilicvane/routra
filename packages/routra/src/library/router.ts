import type {IObservableValue} from 'mobx';
import {observable, runInAction, when} from 'mobx';

import type {ChildSchemaFallback_, SchemaChildrenType_} from './@schema';
import {getCommonStartOfTwoArray} from './@utils';
import type {
  RouteOperation_,
  RouteSwitching,
  RouteTarget,
  RouteType_,
} from './route';
import {RouteEntry, createRouteOperation, createRouteSwitching} from './route';
import type {Schema} from './schema';

export interface RouterOptions<TSwitchingState> {
  defaultSwitchingState: TSwitchingState;
}

export class Router_<TSwitchingState> {
  /** @internal */
  @observable.ref
  _active: RouteEntry | undefined;

  /** @internal */
  @observable.ref
  _transition: TransitionEntry | undefined;

  /** @internal */
  @observable.ref
  _switching: SwitchingEntry | undefined;

  private readonly _queue: RouteTarget[] = [];

  constructor(
    private _schema: Schema,
    private _options: RouterOptions<TSwitchingState>,
  ) {}

  /** @internal */
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

    return createRouteOperation(this, 'reset', {
      path,
      stateMap,
      previous: undefined,
    });
  }

  /** @internal */
  _push(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
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
  ): RouteOperation_<unknown, unknown> {
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
    switchingState: unknown,
  ): RouteSwitching<unknown> {
    const ref = {};

    const switchingStateObservable = observable.box(
      switchingState ?? this._options.defaultSwitchingState,
    );

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
  _set(operation: RouterOperation, target: RouteTarget): void {
    this._startTransition(operation, target);
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
  ): void {
    if (this._transition) {
      this._queue.push(target);
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
    setTimeout(() => {
      void when(
        () =>
          (!active || !active.blockedByLeaving) &&
          !transition.blockedByEntering,
      ).then(() => this._finishTransition(operation));
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
        this._startTransition(operation, next);
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

export type Router__ = Router_<unknown>;

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

export type RouterOperation = 'reset' | 'push' | 'replace' | 'back';

export interface TransitionEntry {
  operation: RouterOperation;
  target: RouteEntry;
}

export interface SwitchingEntry {
  operation: RouterOperation;
  to: RouteEntry;
  switchingStateObservable: IObservableValue<unknown>;
  ref: object;
}

export type Router<
  TSchema extends Schema,
  TSwitchingState,
> = Router_<TSwitchingState> &
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
