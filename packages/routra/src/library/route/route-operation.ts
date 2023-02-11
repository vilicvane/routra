import type {RouterOperation, RouterSetResult, Router__} from '../router';

import type {RouteTarget} from './route-entry';
import type {RouteSwitching} from './route-switching';

export interface RouteOperationTarget {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteTarget | undefined;
}

export function createRouteOperation(
  router: Router__,
  operation: RouterOperation,
  target: RouteOperationTarget,
): RouteOperation<object, object> {
  // E.g.: router.home.$push();
  return Object.setPrototypeOf(
    (statePart: object = {}) =>
      router._set(operation, {
        ...target,
        statePart,
      }),
    new RouteOperationClass(router, operation, target),
  );
}

export interface RouteOperation<
  TMergedState extends object,
  TSwitchingState extends object,
> extends RouteOperationClass<TMergedState, TSwitchingState> {
  (statePart?: Partial<TMergedState>): RouterSetResult;
}

export type RouteOperation__ = RouteOperation<object, object>;

export class RouteOperationClass<
  TMergedState extends object,
  TSwitchingState extends object,
> {
  constructor(
    private router: Router__,
    private operation: RouterOperation,
    private target: RouteOperationTarget,
  ) {}

  $switch(
    statePart: Partial<TMergedState> = {},
    switchingState?: TSwitchingState,
  ): RouteSwitching<TSwitchingState> {
    return this.router._switch(
      this.operation,
      {
        ...this.target,
        statePart,
      },
      switchingState,
    );
  }
}
