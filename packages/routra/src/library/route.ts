import _ from 'lodash';
import {computed, makeObservable} from 'mobx';

import {getCommonStartOfTwoArray, isArrayStartedWith} from './@utils';
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

  get $active(): RouteMatch | false {
    const {$router} = this;

    const active = $router._requireActiveRouteEntry();

    if (!this._isMatched(active)) {
      return false;
    }

    return new RouteMatch(active);
  }

  @computed
  get $exact(): this {
    return Object.create(this, {
      _exact: {
        value: true,
      },
    });
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

export interface RouteEntry {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteEntry | undefined;
  entering: number;
  leaving: number;
}

function isMatched(): void {}
