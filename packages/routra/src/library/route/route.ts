import {computed, makeObservable} from 'mobx';

import type {ChildSchemaFallback_, SchemaState_} from '../@schema';
import type {OverrideObject_} from '../@utils';
import {isArrayEqual, isArrayStartedWith} from '../@utils';
import type {
  ActiveEntry,
  Router__,
  SwitchingEntry,
  TransitionEntry,
} from '../router';
import type {CreateViewOptions} from '../routra';
import {routra} from '../routra';
import type {RouteKey, Schema} from '../schema';
import type {IView} from '../view';

import type {RouteEntry} from './route-entry';
import type {RouteOperation} from './route-operation';

export type Route__ = Route_<Schema, object, object, string[]>;

export type RouteNode__ = RouteNode_<Schema, object, object, string[]>;

export function createRoute(
  router: Router__,
  schema: Schema,
  path: string[],
  stateMapUpdate: Map<number, object>,
): Route__ | RouteNode__ {
  const Constructor = schema.$exact === false ? RouteNodeClass : RouteClass;

  return Object.setPrototypeOf((state: object) => {
    return new Constructor(
      router,
      schema,
      path,
      new Map([...stateMapUpdate, [path.length - 1, state]]),
    );
  }, new Constructor(router, schema, path, stateMapUpdate));
}

export class RouteNodeClass<
  TSwitchingState extends object,
  TMergedState extends object,
  TPath extends string[],
> {
  readonly $key: string;

  private _exact = false;

  private _exactClone: this | undefined;

  constructor(
    readonly $router: Router__,
    schema: Schema,
    readonly $path: TPath,
    protected _stateMapUpdate: Map<number, object>,
  ) {
    makeObservable(this);

    this.$key = $path[$path.length - 1];

    for (let [key, childSchema] of Object.entries(schema)) {
      if (key.startsWith('$')) {
        continue;
      }

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

  get $exact(): this {
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

  get $matched(): boolean {
    return this.$active || this.$transition || this.$switching;
  }

  get $active(): boolean {
    return this._active !== undefined;
  }

  get $transition(): boolean {
    return this._transition !== undefined;
  }

  get $switching(): boolean {
    return this._switching !== undefined;
  }

  /** @internal */

  @computed
  get _active(): ActiveEntry | undefined {
    const {$router} = this;

    const active = $router._requireActive();

    if (!this._isMatched(active.entry)) {
      return undefined;
    }

    return active;
  }

  /** @internal */
  @computed
  get _transition(): TransitionEntry | undefined {
    const {$router} = this;

    const transition = $router._transition;

    if (!transition || !this._isMatched(transition.entry)) {
      return undefined;
    }

    return transition;
  }

  /** @internal */
  @computed
  get _switching(): SwitchingEntry | undefined {
    const {$router} = this;

    const switching = $router._switching;

    if (!switching || !this._isMatched(switching.entry)) {
      return undefined;
    }

    return switching;
  }

  $view(
    options?: CreateViewOptions,
  ): IView<
    RouteNode_<RouteSchemaType_<this>, TSwitchingState, TMergedState, TPath>
  > {
    return routra.$view([this as any], options);
  }

  private _isMatched({path: entryPath}: RouteEntry): boolean {
    const {$path} = this;

    return this._exact
      ? isArrayEqual(entryPath, $path)
      : isArrayStartedWith(entryPath, $path);
  }
}

export interface RouteNode_<
  TSchema,
  TSwitchingState extends object,
  TMergedState extends object,
  TPath extends string[],
> extends RouteNodeClass<TSwitchingState, TMergedState, TPath> {
  (state: SchemaState_<TSchema>): this;
}

export class RouteClass<
  TSwitchingState extends object,
  TMergedState extends object,
  TPath extends string[],
> extends RouteNodeClass<TSwitchingState, TMergedState, TPath> {
  constructor(
    $router: Router__,
    schema: Schema,
    $path: TPath,
    stateMapUpdate: Map<number, object>,
  ) {
    super($router, schema, $path, stateMapUpdate);
  }

  get $reset(): RouteOperation<TMergedState, TSwitchingState> {
    return this.$router._reset(this.$path, this._stateMapUpdate);
  }

  get $push(): RouteOperation<TMergedState, TSwitchingState> {
    return this.$router._push(this.$path, this._stateMapUpdate);
  }

  get $replace(): RouteOperation<TMergedState, TSwitchingState> {
    return this.$router._replace(this.$path, this._stateMapUpdate);
  }
}

declare const __schema_type: unique symbol;

export interface Route_<
  TSchema,
  TSwitchingState extends object,
  TMergedState extends object,
  TPath extends string[],
> extends RouteClass<TSwitchingState, TMergedState, TPath> {
  [__schema_type]: TSchema;

  (state: SchemaState_<TSchema>): this;
}

type RouteSchemaType_<TRoute> = TRoute extends {
  [__schema_type]: infer TSchema extends Schema;
}
  ? TSchema
  : never;

export type RouteType_<
  TSchema,
  TSwitchingState extends object,
  TUpperMergedState extends object,
  TPath extends string[],
> = OverrideObject_<
  TUpperMergedState,
  SchemaState_<TSchema>
> extends infer TMergedState extends object
  ? (TSchema extends {$exact: false}
      ? RouteNode_<TSchema, TSwitchingState, TMergedState, TPath>
      : Route_<TSchema, TSwitchingState, TMergedState, TPath>) & {
      [TKey in Extract<keyof TSchema, RouteKey>]: RouteType_<
        ChildSchemaFallback_<TSchema[TKey]>,
        TSwitchingState,
        TMergedState,
        [...TPath, TKey]
      >;
    }
  : never;

export type Route<
  TSchema extends Schema,
  TSwitchingState extends object,
  TUpperMergedState extends object,
  TPath extends string[],
> = RouteType_<TSchema, TSwitchingState, TUpperMergedState, TPath>;

export type RouteSwitchingState_<TRoute> = TRoute extends RouteNode_<
  any,
  infer TSwitchingState,
  any,
  any
>
  ? TSwitchingState
  : {};

export type RouteMergedState_<TRoute> = TRoute extends RouteNode_<
  any,
  any,
  infer TMergedState,
  any
>
  ? TMergedState
  : {};
