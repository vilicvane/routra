import _ from 'lodash';
import {makeObservable} from 'mobx';

import type {
  ChildSchemaFallback_,
  SchemaChildrenType_,
  SchemaStateType_,
} from '../@schema';
import type {OverrideObject_} from '../@utils';
import {isArrayStartedWith} from '../@utils';
import type {Router__} from '../router';
import type {CreateViewOptions} from '../routra';
import {routra} from '../routra';
import type {Schema} from '../schema';
import type {IView, IView__} from '../view';

import type {RouteEntry} from './route-entry';
import type {RouteOperation_} from './route-operation';

export type Route__ = Route_<Schema, unknown, object, string[]>;

export type RouteNode__ = RouteNode_<Schema, string[]>;

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

export class RouteNodeObject_<TPath extends string[]> {
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

  get $active(): boolean {
    return this._active !== undefined;
  }

  /** @internal */
  get _active(): RouteEntry | undefined {
    const {$router} = this;

    const active = $router._requireActiveRouteEntry();

    if (!this._isMatched(active)) {
      return undefined;
    }

    return active;
  }

  /** @internal */
  get _transition(): RouteEntry | undefined {
    const {$router} = this;

    const transition = $router._transition?.target;

    if (!transition || !this._isMatched(transition)) {
      return undefined;
    }

    return transition;
  }

  private _isMatched({path: entryPath}: RouteEntry): boolean {
    const {$path} = this;

    return this._exact
      ? _.isEqual(entryPath, $path)
      : isArrayStartedWith(entryPath, $path);
  }
}

export interface RouteNode_<TSchema, TPath extends string[]>
  extends RouteNodeObject_<TPath> {
  (state: SchemaStateType_<TSchema>): this;
}

export class RouteObject_<
  TSwitchingState,
  TMergedState,
  TPath extends string[],
> extends RouteNodeObject_<TPath> {
  constructor(
    $router: Router__,
    schema: Schema,
    $path: TPath,
    stateMapUpdate: Map<number, object>,
  ) {
    super($router, schema, $path, stateMapUpdate);
  }

  get $reset(): RouteOperation_<TMergedState, TSwitchingState> {
    return this.$router._reset(this.$path, this._stateMapUpdate);
  }

  get $push(): RouteOperation_<TMergedState, TSwitchingState> {
    return this.$router._push(this.$path, this._stateMapUpdate);
  }

  get $replace(): RouteOperation_<TMergedState, TSwitchingState> {
    return this.$router._replace(this.$path, this._stateMapUpdate);
  }

  $view(
    options?: CreateViewOptions,
  ): IView<
    Route_<RouteSchemaType_<this>, TSwitchingState, TMergedState, TPath>
  > {
    return routra.$view([this as any], options);
  }
}

declare const __schema_type: unique symbol;

export interface Route_<
  TSchema,
  TSwitchingState,
  TMergedState,
  TPath extends string[],
> extends RouteObject_<TSwitchingState, TMergedState, TPath> {
  [__schema_type]: TSchema;

  (state: SchemaStateType_<TSchema>): this;
}

type RouteSchemaType_<TRoute> = TRoute extends {
  [__schema_type]: infer TSchema extends Schema;
}
  ? TSchema
  : never;

export type RouteType_<
  TSchema,
  TSwitchingState,
  TUpperMergedState,
  TPath extends string[],
> = OverrideObject_<
  TUpperMergedState,
  SchemaStateType_<TSchema>
> extends infer TMergedState
  ? (TSchema extends {$exact: false}
      ? RouteNode_<TSchema, TPath>
      : Route_<TSchema, TSwitchingState, TMergedState, TPath>) &
      (SchemaChildrenType_<TSchema> extends infer TSchemaRecord
        ? {
            [TKey in Extract<keyof TSchemaRecord, string>]: RouteType_<
              ChildSchemaFallback_<TSchemaRecord[TKey]>,
              TSwitchingState,
              TMergedState,
              [...TPath, TKey]
            >;
          }
        : never)
  : never;

export type Route<
  TSchema extends Schema,
  TSwitchingState,
  TUpperMergedState extends object,
  TPath extends string[],
> = RouteType_<TSchema, TSwitchingState, TUpperMergedState, TPath>;

export type RouteMergedState_<TRoute> = TRoute extends Route_<
  any,
  any,
  infer TMergedState,
  any
>
  ? TMergedState
  : never;
