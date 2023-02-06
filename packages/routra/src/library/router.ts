import type {IObservableValue} from 'mobx';
import {observable, runInAction, when} from 'mobx';

import {getCommonStartOfTwoArray} from './@utils';
import type {RouteTarget} from './route-entry';
import {RouteEntry} from './route-entry';
import type {RouteOperation_} from './route-operation';
import {createRouteOperation} from './route-operation';
import type {Schema} from './schema';

export class Router_ {
  /** @internal */
  @observable.ref
  _active: RouteEntry | undefined;

  /** @internal */
  @observable.ref
  _transition: RouteEntry | undefined;

  /** @internal */
  @observable.ref
  _switching: SwitchingEntry | undefined;

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

    const active = this._active;

    const transition = new RouteEntry(
      this,
      target.path,
      target.stateMap,
      target.previous,
    );

    runInAction(() => {
      this._transition = transition;
    });

    // Wait initial render to register transition.
    setTimeout(() => {
      void when(
        () =>
          (!active || !active.blockedByLeaving) &&
          !transition.blockedByEntering,
      ).then(() => this._finishTransition());
    });
  }

  private _finishTransition(): void {
    const transition = this._transition;

    if (!transition) {
      throw new Error('Expected transition route entry');
    }

    runInAction(() => {
      this._active = transition;

      this._transition = undefined;

      const next = this._queue.shift();

      if (next) {
        this._startTransition(next);
      }
    });
  }
}

export type Router__ = Router_;

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

/** @internal */
export interface SwitchingEntry {
  switchingStateObservable: IObservableValue<unknown>;
  to: RouteEntry;
}
