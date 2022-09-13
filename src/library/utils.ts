import type {__Route} from './route';
import type {_RouterClass, __Router} from './router';
import type {_Transition} from './transition';

export type RouteView<TRoute extends __Route> = TRoute['$views'][number];

export type Transition<TRouter extends __Router> = _Transition<
  TransitionState<TRouter>
>;

export type TransitionState<TRouter extends __Router> =
  TRouter extends _RouterClass<unknown, unknown, infer TTransitionState>
    ? TTransitionState
    : never;
