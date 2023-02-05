import _ from 'lodash';
import {computed, makeObservable} from 'mobx';

import type {StateType} from './@schema';
import {getCommonStartOfTwoArray, isArrayStartedWith} from './@utils';
import type {RouteEntry} from './route-entry';
import {RouteMatch} from './route-matched';
import type {RouteOperation_} from './route-operation';
import type {Router__} from './router';
import type {Schema} from './schema';

export type Route__ = Route_<Schema, object, object, string[], unknown>;

export type RouteNode__ = RouteNode_<Schema, object, string[]>;

export function createRoute(
  router: Router__,
  schema: Schema,
  path: string[],
  stateMapUpdate: Map<number, object>,
): Route__ {
  const Route = schema.$exact === false ? RouteNodeObject_ : RouteObject_;

  const route: any = (state: object) =>
    new Route(
      router,
      schema,
      path,
      new Map([...stateMapUpdate, [path.length - 1, state]]),
    );

  Object.setPrototypeOf(route, new Route(router, schema, path, stateMapUpdate));

  return route;
}

export class RouteNodeObject_<TView, TPath extends string[]> {
  readonly $key = _.last(this.$path)!;

  /**
   * @internal
   */
  _exact = false;

  _exactClone: this | undefined;

  constructor(
    readonly $router: Router__,
    {$children}: Schema,
    readonly $path: TPath,
    protected _stateMapUpdate: Map<number, object>,
  ) {
    makeObservable(this);

    if ($children) {
      for (let [key, childSchema] of Object.entries($children)) {
        if (childSchema === true) {
          childSchema = {};
        }

        (this as any)[key] = createRoute(
          $router,
          childSchema as Schema,
          [...$path, key],
          _stateMapUpdate,
        );
      }
    }
  }

  get $exact(): Omit<this, '$exact'> {
    let clone = this._exactClone;

    if (clone) {
      return clone;
    }

    clone = Object.create(this, {
      _exact: {
        value: true,
      },
    }) as this;

    this._exactClone = clone;

    return clone;
  }

  get $active(): RouteEntry | false {
    const {$router} = this;

    const active = $router._requireActiveRouteEntry();

    if (!this._isMatched(active)) {
      return false;
    }

    return active;
  }

  get $transition(): RouteEntry | false {
    const {$router} = this;

    const transition = $router._transition?.entry;

    if (!transition || !this._isMatched(transition)) {
      return false;
    }

    return transition;
  }

  $view(): TView {
    return createView([this]);
  }

  private _isMatched({path: entryPath}: RouteEntry): boolean {
    const {$path} = this;

    return this._exact
      ? _.isEqual(entryPath, $path)
      : isArrayStartedWith(entryPath, $path);
  }
}

export interface RouteNode_<TSchema, TView, TPath extends string[]>
  extends RouteNodeObject_<TView, TPath> {
  (state: StateType<TSchema>): this;
}

export class RouteObject_<
  TMergedState,
  TView,
  TPath extends string[],
  TTransitionState,
> extends RouteNodeObject_<TView, TPath> {
  constructor(
    $router: Router__,
    schema: Schema,
    $path: TPath,
    newStateMap: Map<number, object>,
  ) {
    super($router, schema, $path, newStateMap);
  }

  get $reset(): RouteOperation_<TMergedState, TTransitionState> {
    return this.$router._reset(this.$path, this._stateMapUpdate);
  }

  get $push(): RouteOperation_<TMergedState, TTransitionState> {
    return this.$router._push(this.$path, this._stateMapUpdate);
  }

  get $replace(): RouteOperation_<TMergedState, TTransitionState> {
    return this.$router._replace(this.$path, this._stateMapUpdate);
  }
}

export interface Route_<
  TSchema,
  TMergedState,
  TView,
  TPath extends string[],
  TTransitionState,
> extends RouteObject_<TMergedState, TView, TPath, TTransitionState> {
  (state: StateType<TSchema>): this;
}

function isMatched(): void {}
