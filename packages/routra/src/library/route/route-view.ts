import {MultikeyMap} from 'multikey-map';

import type {IView, IView__} from '../view/index.js';
import {ParallelView__, SingleView__} from '../view/index.js';

import type {RouteNodeClass__} from './route.js';

const viewCache = new MultikeyMap<unknown[], IView__>();

export type RouteViewOptions = {
  single?: boolean;
};

export function $view<TRoute extends RouteNodeClass__>(
  routes: TRoute[],
  options?: RouteViewOptions,
): IView<TRoute>;
export function $view(
  routes: RouteNodeClass__[],
  {single = false}: RouteViewOptions = {},
): IView__ {
  const key = [single, ...routes];

  let view = viewCache.get(key);

  if (!view) {
    view = single ? new SingleView__(routes) : new ParallelView__(routes);
    viewCache.set(key, view);
  }

  return view;
}
