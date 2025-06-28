import type {
  RouterOperation,
  RouterSetResult,
  Router__,
} from '../router/index.js';

import type {RouteTarget} from './route-entry.js';
import type {RouteSwitching} from './route-switching.js';

export type RouteOperationTarget = {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteTarget | undefined;
  next: RouteTarget | undefined;
};

export function createRouteOperation(
  router: Router__,
  operation: RouterOperation,
  targetBuilder: () => RouteOperationTarget,
): RouteOperation<object, object> {
  // E.g.: router.home.$push();
  return Object.setPrototypeOf(
    (statePart: object = {}) =>
      router._set(operation, () => {
        return {
          ...targetBuilder(),
          statePart,
        };
      }),
    new RouteOperationClass(router, operation, targetBuilder),
  );
}

export type RouteOperation<
  TMergedState extends object,
  TSwitchingState extends object,
> = RouteOperationClass<TMergedState, TSwitchingState> &
  {
    bivariance(statePart?: Partial<TMergedState>): RouterSetResult;
  }['bivariance'];

export type RouteOperation__ = RouteOperation<object, object>;

export class RouteOperationClass<
  TMergedState extends object,
  TSwitchingState extends object,
> {
  constructor(
    private router: Router__,
    private operation: RouterOperation,
    private targetBuilder: () => RouteOperationTarget,
  ) {}

  $switch(
    statePart: Partial<TMergedState> = {},
    switchingState?: TSwitchingState,
  ): RouteSwitching<TSwitchingState> {
    return this.router._switch(
      this.operation,
      {
        ...this.targetBuilder(),
        statePart,
      },
      switchingState,
    );
  }
}
