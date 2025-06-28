import type {RouteSwitching, RouteTarget} from '../route/index.js';

import type {RouterSetResult, Router__} from './router.js';

export type RouteBackForwardTarget = {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteTarget | undefined;
  next: RouteTarget | undefined;
};

export function createRouterBackForward(
  router: Router__,
  operation: 'back' | 'forward',
  target: RouteBackForwardTarget,
): RouterBack__ {
  return Object.setPrototypeOf(
    () =>
      router._set(operation, () => {
        return {
          ...target,
          statePart: undefined,
        };
      }),
    new RouterBackForwardClass(router, operation, target),
  );
}

export type RouterBackForward<TSwitchingState extends object> = {
  (): RouterSetResult;
} & RouterBackForwardClass<TSwitchingState>;

export type RouterBack__ = RouterBackForward<object>;

export class RouterBackForwardClass<TSwitchingState extends object> {
  constructor(
    private router: Router__,
    private operation: 'back' | 'forward',
    private target: RouteBackForwardTarget,
  ) {}

  $switch(switchingState?: TSwitchingState): RouteSwitching<TSwitchingState> {
    return this.router._switch(
      this.operation,
      {
        ...this.target,
        statePart: undefined,
      },
      switchingState,
    );
  }

  $go(): RouterSetResult {
    return this.router._set(this.operation, () => {
      return {
        ...this.target,
        statePart: undefined,
      };
    });
  }
}
