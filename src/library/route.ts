import _ from 'lodash';
import {computed} from 'mobx';

import {getCommonStartOfTwoArray} from './@utils';
import type {__Router} from './router';
import type {StateType, __Schema} from './schema';
import type {IView, _ViewBuilder} from './view';

export type __Route = _Route<__Schema, object, string[]>;

export function _createRoute(
  router: __Router,
  schema: __Schema,
  path: string[],
  statePartMap: Map<string, object>,
): _Route<__Schema, object, string[]> {
  let route: any = (state: object) => {
    let alteredStatePartMap = new Map([
      ...statePartMap,
      [_.last(path)!, state],
    ]);

    return _createRoute(router, schema, path, alteredStatePartMap);
  };

  Object.setPrototypeOf(
    route,
    new _RouteObject(router, schema, path, statePartMap),
  );

  return route;
}

export class _RouteObject<TView, TPath extends string[]> {
  readonly $key = _.last(this.$path)!;

  constructor(
    $router: __Router,
    schema: __Schema,
    $path: TPath,
    stateParts: Map<string, object>,
  );
  constructor(
    readonly $router: __Router,
    schema: __Schema,
    readonly $path: TPath,
    private __stateParts: Map<string, object>,
  ) {
    let pathKeySet = new Set($path);

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
        __stateParts,
      );
    }
  }

  @computed
  get $view(): (TView & IView) | undefined {
    let {path: activePath, viewComputedValueMap: viewMap} =
      this.$router._activeEntry;

    let path = this.$path;

    return getCommonStartOfTwoArray(path, activePath).length === path.length
      ? (viewMap.get(this.$key)!.get() as any)
      : undefined;
  }

  $reset(): void {
    this.$router._reset(this.$path, this.__stateParts);
  }

  $push(): void {
    this.$router._push(this.$path, this.__stateParts);
  }

  $replace(): void {
    this.$router._replace(this.$path, this.__stateParts);
  }

  $pop(): void {
    this.$router._pop(this.$path);
  }
}

export interface _Route<TSchema, TView, TPath extends string[]>
  extends _RouteObject<TView, TPath> {
  (state: Partial<StateType<TSchema>>): this;
}

export type _RouteType<
  TSchema,
  TViewDefinitionRecord,
  TUpperMergedState,
  TPath extends string[],
> = Exclude<
  Exclude<keyof TViewDefinitionRecord, '$view'>,
  Exclude<keyof TSchema, `$${string}`>
> extends infer TExtraViewKey extends string
  ? [TExtraViewKey] extends [never]
    ? TUpperMergedState & StateType<TSchema> extends infer TMergedState
      ? _Route<
          TSchema,
          TViewDefinitionRecord extends {
            $view: _ViewBuilder<unknown, infer TView>;
          }
            ? TMergedState & TView & IView
            : TMergedState & IView,
          TPath
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
            [...TPath, TKey]
          >;
        }
      : never
    : {TypeError: `Unexpected view key "${TExtraViewKey}"`}
  : never;
