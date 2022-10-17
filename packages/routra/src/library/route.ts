import _ from 'lodash';
import {computed, makeObservable} from 'mobx';

import type {MultiOverrideObject_, OverrideObject_} from './@utils';
import type {RouteOperation_} from './route-operation';
import type {Router__} from './router';
import type {Schema__, StateType} from './schema';
import type {IView, ViewBuilder_, ViewBuilder__} from './view';

export type Route__ = Route_<Schema__, object, object, string[], unknown>;

export type RouteNode__ = RouteNode_<Schema__, object, string[], unknown>;

export function createRoute(
  router: Router__,
  schema: Schema__,
  path: string[],
  newStateMap: Map<string, object>,
): Route_<Schema__, object, object, string[], unknown> {
  const Route = schema.$exact === false ? RouteNodeObject_ : RouteObject_;

  const route: any = (state: object) =>
    new Route(
      router,
      schema,
      path,
      new Map([...newStateMap, [_.last(path)!, state]]),
    );

  Object.setPrototypeOf(route, new Route(router, schema, path, newStateMap));

  return route;
}

export class RouteNodeObject_<TView, TPath extends string[], TTransitionState> {
  readonly $key = _.last(this.$path)!;

  constructor(
    readonly $router: Router__,
    schema: Schema__,
    readonly $path: TPath,
    protected _newStateMap: Map<string, object>,
  ) {
    makeObservable(this);

    const pathKeySet = new Set($path);

    for (let [key, childSchema] of Object.entries(schema)) {
      if (key.startsWith('$')) {
        continue;
      }

      if (pathKeySet.has(key)) {
        throw new Error(`Duplicate key in path ${JSON.stringify(key)}`);
      }

      if (childSchema === true) {
        childSchema = {};
      }

      (this as any)[key] = createRoute(
        $router,
        childSchema as Schema__,
        [...$path, key],
        _newStateMap,
      );
    }
  }

  @computed
  get $views(): (TView & IView<TTransitionState>)[] {
    const path = this.$path;

    return this.$router
      ._getActiveEntries(path)
      .map(entry => entry.viewComputedValues[path.length - 1]!.get() as any);
  }
}

export interface RouteNode_<
  TSchema,
  TView,
  TPath extends string[],
  TTransitionState,
> extends RouteNodeObject_<TView, TPath, TTransitionState> {
  (state: StateType<TSchema>): this;
}

export class RouteObject_<
  TMergedState,
  TView,
  TPath extends string[],
  TTransitionState,
> extends RouteNodeObject_<TView, TPath, TTransitionState> {
  constructor(
    $router: Router__,
    schema: Schema__,
    $path: TPath,
    newStateMap: Map<string, object>,
  ) {
    super($router, schema, $path, newStateMap);
  }

  get $reset(): RouteOperation_<TMergedState, TTransitionState> {
    return this.$router._reset(this.$path, this._newStateMap);
  }

  get $push(): RouteOperation_<TMergedState, TTransitionState> {
    return this.$router._push(this.$path, this._newStateMap);
  }

  get $replace(): RouteOperation_<TMergedState, TTransitionState> {
    return this.$router._replace(this.$path, this._newStateMap);
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

export type RouteType_<
  TSchema,
  TViewDefinitionRecord,
  TUpperMergedState,
  TPath extends string[],
  TTransitionState,
> = Exclude<
  Exclude<keyof TViewDefinitionRecord, '$view'>,
  Exclude<keyof TSchema, `$${string}`>
> extends infer TExtraViewKey extends string
  ? [TExtraViewKey] extends [never]
    ? OverrideObject_<
        TUpperMergedState,
        StateType<TSchema>
      > extends infer TMergedState
      ? ((
          TViewDefinitionRecord extends {
            $view: ViewBuilder_<unknown, infer TView>;
          }
            ? MultiOverrideObject_<
                TMergedState,
                [IView<TTransitionState>, TView]
              >
            : TViewDefinitionRecord extends {
                $view: infer TViewBuilders extends ViewBuilder__[];
              }
            ? MultiOverrideObject_<
                TMergedState,
                [
                  IView<TTransitionState>,
                  ...{
                    [TIndex in keyof TViewBuilders]: TViewBuilders[TIndex] extends ViewBuilder_<
                      unknown,
                      infer TView
                    >
                      ? TView
                      : never;
                  },
                ]
              >
            : OverrideObject_<TMergedState, IView<TTransitionState>>
        ) extends infer TView
          ? TSchema extends {$exact: false}
            ? RouteNode_<TSchema, TView, TPath, TTransitionState>
            : Route_<TSchema, TMergedState, TView, TPath, TTransitionState>
          : never) & {
          [TKey in Exclude<
            Extract<keyof TSchema, string>,
            `$${string}`
          >]: RouteType_<
            TSchema[TKey] extends infer TChildSchema extends object
              ? TChildSchema
              : {},
            TViewDefinitionRecord extends Record<TKey, object>
              ? TViewDefinitionRecord[TKey]
              : {},
            TMergedState,
            [...TPath, TKey],
            TTransitionState
          >;
        }
      : never
    : {TypeError: `Unexpected view key "${TExtraViewKey}"`}
  : never;
