import type {RouteNode__} from './route';
import type {Router_, Router__} from './router';
import type {Transition} from './transition';

export type RouteView<TRoute extends RouteNode__> = TRoute['$views'][number];

export type RouterTransition<TRouter extends Router__> = Transition<
  RouterTransitionState<TRouter>
>;

export type RouterTransitionState<TRouter extends Router__> =
  TRouter extends Router_<unknown, unknown, infer TTransitionState>
    ? TTransitionState
    : never;

export type OverrideObject_<TObject, TOverride> = Omit<
  TObject,
  keyof TOverride
> &
  TOverride;

export type MultiOverrideObject_<TObject, TOverrides> = TOverrides extends [
  infer TOverride,
  ...infer TRestOverrides,
]
  ? MultiOverrideObject_<
      Omit<TObject, keyof TOverride> & TOverride,
      TRestOverrides
    >
  : TObject;
