import type {RouteNode__} from './route';
import type {RouterClass_, Router__} from './router';
import type {Transition} from './transition';

export type RouteView<TRoute extends RouteNode__> = TRoute['$views'][number];

export type RouterTransition<TRouter extends Router__> = Transition<
  RouterTransitionState<TRouter>
>;

export type RouterTransitionState<TRouter extends Router__> =
  TRouter extends RouterClass_<unknown, unknown, infer TTransitionState>
    ? TTransitionState
    : never;
