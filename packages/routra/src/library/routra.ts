import MultikeyMap from 'multikey-map';

import type {RouteNode__} from './route';
import type {Router, RouterOptions, Router__} from './router';
import {RouterClass} from './router';
import type {SchemaRecord} from './schema';
import type {IView, IView__} from './view';
import {ParallelView__, SingleView__} from './view';

export function routra<TSchemaRecord extends SchemaRecord>(
  schemas: TSchemaRecord,
): Router<TSchemaRecord, object>;
export function routra<
  TSchemaRecord extends SchemaRecord,
  TSwitchingState extends object,
>(
  schemas: TSchemaRecord,
  options: RouterOptions<TSwitchingState>,
): Router<TSchemaRecord, TSwitchingState>;
export function routra(
  schemas: SchemaRecord,
  options: RouterOptions<object> = {defaultSwitchingState: undefined},
): Router__ {
  return new RouterClass(schemas, options);
}

export interface CreateViewOptions {
  single?: boolean;
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
