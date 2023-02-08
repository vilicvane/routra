import MultikeyMap from 'multikey-map';

import type {RouteNode__} from './route';
import type {Router, RouterOptions, Router__} from './router';
import {RouterClass} from './router';
import type {Schema} from './schema';
import type {IView, IView__} from './view';
import {ParallelView__, SingleView__} from './view';

export interface CreateViewOptions {
  single?: boolean;
}

export function routra<TSchema extends Schema>(
  schema: TSchema,
): Router<TSchema, object>;
export function routra<TSchema extends Schema, TSwitchingState extends object>(
  schema: TSchema,
  options: RouterOptions<TSwitchingState>,
): Router<TSchema, TSwitchingState>;
export function routra(
  schema: Schema,
  options: RouterOptions<object> = {defaultSwitchingState: undefined},
): Router__ {
  return new RouterClass(schema, options);
}

export namespace routra {
  const viewCache = new MultikeyMap<unknown[], IView__>();

  export function $view<TRoute extends RouteNode__>(
    routes: TRoute[],
    options?: CreateViewOptions,
  ): IView<TRoute>;
  export function $view(
    routes: RouteNode__[],
    {single = false}: CreateViewOptions = {},
  ): IView__ {
    const key = [single, ...routes];

    let view = viewCache.get(key);

    if (!view) {
      view = single ? new SingleView__(routes) : new ParallelView__(routes);
      viewCache.set(key, view);
    }

    return view;
  }
}

export default routra;
