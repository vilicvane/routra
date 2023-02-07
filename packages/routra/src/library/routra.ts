import type {RouteNode__} from './route';
import type {Router, RouterOptions, Router__} from './router';
import {Router_} from './router';
import type {Schema} from './schema';
import type {IView, IView__} from './view';
import {ParallelView__, SingleView__} from './view';

export interface CreateViewOptions {
  single?: boolean;
}

export function routra<TSchema extends Schema>(
  schema: TSchema,
): Router<TSchema, undefined>;
export function routra<TSchema extends Schema, TSwitchingState>(
  schema: TSchema,
  options: RouterOptions<TSwitchingState>,
): Router<TSchema, TSwitchingState>;
export function routra(
  schema: Schema,
  options: RouterOptions<unknown> = {defaultSwitchingState: undefined},
): Router__ {
  return new Router_(schema, options);
}

export namespace routra {
  export function $view<TRoute extends RouteNode__>(
    routes: TRoute[],
    options?: CreateViewOptions,
  ): IView<TRoute>;
  export function $view(
    routes: RouteNode__[],
    {single = false}: CreateViewOptions = {},
  ): IView__ {
    return single ? new SingleView__(routes) : new ParallelView__(routes);
  }
}

export default routra;
