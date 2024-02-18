import type {RouteSwitching, RouteTarget} from '../route/index.js';

import type {RouterSetResult, Router__} from './router.js';

export type RouteBackTarget = {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteTarget | undefined;
};

export function createRouterBack(
  router: Router__,
  target: RouteBackTarget,
): RouterBack__ {
  return Object.setPrototypeOf(
    () =>
      router._set('back', () => {
        return {
          ...target,
          statePart: undefined,
        };
      }),
    new RouterBackClass(router, target),
  );
}

export type RouterBack<TSwitchingState extends object> = {
  (): RouterSetResult;
} & RouterBackClass<TSwitchingState>;

export type RouterBack__ = RouterBack<object>;

export class RouterBackClass<TSwitchingState extends object> {
  constructor(
    private router: Router__,
    private target: RouteBackTarget,
  ) {}

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

  $go(): RouterSetResult {
    return this.router._set('back', () => {
      return {
        ...this.target,
        statePart: undefined,
      };
    });
  }
}
