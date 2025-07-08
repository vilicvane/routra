import {MultikeyMap} from 'multikey-map';

import type {IView, IView__} from '../view/index.js';
import {ParallelView__, SingleView__} from '../view/index.js';

import type {RouteNodeClass__} from './route.js';

const viewCache = new MultikeyMap<unknown[], IView__>();

export type RouteViewOptions = {
  parallel?: boolean;
};

export function $view<TRoute extends RouteNodeClass__>(
  routes: TRoute[],
  options?: RouteViewOptions,
): IView<TRoute>;
export function $view(
  routes: RouteNodeClass__[],
  {parallel = false}: RouteViewOptions = {},
): IView__ {
  const key = [parallel, ...routes];

  let view = viewCache.get(key);

  if (!view) {
    view = parallel ? new ParallelView__(routes) : new SingleView__(routes);
    viewCache.set(key, view);
  }

  return view;
}
