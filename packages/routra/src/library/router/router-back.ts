import type {RouteSwitching, RouteTarget} from '../route';

import type {RouterSetResult, Router__} from './router';

export interface RouteBackTarget {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteTarget | undefined;
}

export function createRouterBack(
  router: Router__,
  target: RouteBackTarget,
): RouterBack__ {
  return Object.setPrototypeOf(
    () =>
      router._set('back', {
        ...target,
        statePart: undefined,
      }),
    new RouterBackClass(router, target),
  );
}

export interface RouterBack<TSwitchingState extends object>
  extends RouterBackClass<TSwitchingState> {
  (): RouterSetResult;
}

export type RouterBack__ = RouterBack<object>;

export class RouterBackClass<TSwitchingState extends object> {
  constructor(private router: Router__, private target: RouteBackTarget) {}

  $switch(switchingState?: TSwitchingState): RouteSwitching<TSwitchingState> {
    return this.router._switch(
      'back',
      {
        ...this.target,
        statePart: undefined,
      },
      switchingState,
    );
  }
}
