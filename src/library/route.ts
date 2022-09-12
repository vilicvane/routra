import _ from 'lodash';
import {computed} from 'mobx';

import type {_RouteOperation} from './route-operation';
import {_createRouteOperation} from './route-operation';
import type {__Router} from './router';
import type {StateType, __Schema} from './schema';
import type {_Transition} from './transition';
import type {IView, _ViewBuilder} from './view';

export type __Route = _Route<__Schema, object, object, string[], unknown>;

export function _createRoute(
  router: __Router,
  schema: __Schema,
  path: string[],
  newStateMap: Map<string, object>,
): _Route<__Schema, object, object, string[], unknown> {
  const route: any = (state: object) =>
    new _RouteObject(
      router,
      schema,
      path,
      new Map([...newStateMap, [_.last(path)!, state]]),
    );

  Object.setPrototypeOf(
    route,
    new _RouteObject(router, schema, path, newStateMap),
  );

  return route;
}

export class _RouteObject<
  TMergedState,
  TView,
  TPath extends string[],
  TTransitionState,
> {
  readonly $key = _.last(this.$path)!;

  constructor(
    $router: __Router,
    schema: __Schema,
    $path: TPath,
    newStateMap: Map<string, object>,
  );
  constructor(
    readonly $router: __Router,
    schema: __Schema,
    readonly $path: TPath,
    private _newStateMap: Map<string, object>,
  ) {
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

      (this as any)[key] = _createRoute(
        $router,
        childSchema as __Schema,
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

  get $reset(): _RouteOperation<TMergedState, TTransitionState> {
    return this.$router._reset(this.$path, this._newStateMap);
  }

  get $push(): _RouteOperation<TMergedState, TTransitionState> {
    return this.$router._push(this.$path, this._newStateMap);
  }

  get $replace(): _RouteOperation<TMergedState, TTransitionState> {
    return this.$router._replace(this.$path, this._newStateMap);
  }
}

export interface _Route<
  TSchema,
  TMergedState,
  TView,
  TPath extends string[],
  TTransitionState,
> extends _RouteObject<TMergedState, TView, TPath, TTransitionState> {
  (state: StateType<TSchema>): this;
}

export type _RouteType<
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
    ? TUpperMergedState & StateType<TSchema> extends infer TMergedState
      ? _Route<
          TSchema,
          TMergedState,
          TViewDefinitionRecord extends {
            $view: _ViewBuilder<unknown, infer TView>;
          }
            ? TMergedState & TView & IView<TTransitionState>
            : TMergedState & IView<TTransitionState>,
          TPath,
          TTransitionState
        > & {
          [TKey in Exclude<
            Extract<keyof TSchema, string>,
            `$${string}`
          >]: _RouteType<
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
