import _ from 'lodash';
import {computed, makeObservable} from 'mobx';

import type {RouteOperation_} from './route-operation';
import type {Router__} from './router';
import type {Schema__, StateType} from './schema';
import type {MultiOverrideObject_, OverrideObject_} from './utils';
import type {IView, IView__, ViewBuilder_, ViewBuilder__} from './view';

export type Route__ = Route_<Schema__, object, object, string[], unknown>;

export type RouteNode__ = RouteNode_<Schema__, object, string[]>;

export function createRoute(
  router: Router__,
  schema: Schema__,
  path: string[],
  newStateMap: Map<number, object>,
): Route_<Schema__, object, object, string[], unknown> {
  const Route = schema.$exact === false ? RouteNodeObject_ : RouteObject_;

  const route: any = (state: object) =>
    new Route(
      router,
      schema,
      path,
      new Map([...newStateMap, [path.length - 1, state]]),
    );

  Object.setPrototypeOf(route, new Route(router, schema, path, newStateMap));

  return route;
}

export class RouteNodeObject_<TView, TPath extends string[]> {
  readonly $key = _.last(this.$path)!;

  constructor(
    readonly $router: Router__,
    schema: Schema__,
    readonly $path: TPath,
    protected _newStateMap: Map<number, object>,
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
  get $views(): (TView & IView__)[] {
    const path = this.$path;

    return this.$router
      ._getActiveEntries(path)
      .map(entry => entry.mergedViews[path.length - 1] as any);
  }

  /**
   * @deprecated
   */
  @computed
  get $matched(): boolean {
    return this.$views.length > 0;
  }

  /**
   * @deprecated
   */
  @computed
  get $exact(): boolean {
    return this.$views.some(view => view.$exact);
  }

  /**
   * @deprecated
   */
  @computed
  get $stable(): boolean {
    return this.$views.some(view => view.$transition === undefined);
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
    schema: Schema__,
    $path: TPath,
    newStateMap: Map<number, object>,
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
                [IView<TPath, TTransitionState>, TView]
              >
            : TViewDefinitionRecord extends {
                $view: infer TViewBuilders extends ViewBuilder__[];
              }
            ? MultiOverrideObject_<
                TMergedState,
                [
                  IView<TPath, TTransitionState>,
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
            : OverrideObject_<TMergedState, IView<TPath, TTransitionState>>
        ) extends infer TView
          ? TSchema extends {$exact: false}
            ? RouteNode_<TSchema, TView, TPath>
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
