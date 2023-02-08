import {mergeStateMapWithPart} from '../@state';
import type {RouterOperation, RouterSetResult, Router__} from '../router';

import type {RouteTarget} from './route-entry';
import type {RouteSwitching} from './route-switching';

export function createRouteOperation(
  router: Router__,
  operation: RouterOperation,
  target: RouteTarget,
): RouteOperation<object, object> {
  // E.g.: router.home.$push();
  return Object.setPrototypeOf((statePart: object = {}) => {
    const {path, stateMap, previous} = target;

    return router._set(operation, {
      path,
      stateMap: mergeStateMapWithPart(path, stateMap, statePart),
      previous,
    });
  }, new RouteOperationClass(router, operation, target));
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
    private target: RouteTarget,
  ) {}

  $switch(
    statePart: Partial<TMergedState> = {},
    switchingState?: TSwitchingState,
  ): RouteSwitching<TSwitchingState> {
    const {path, stateMap, previous} = this.target;

    return this.router._switch(
      this.operation,
      {
        path,
        stateMap: mergeStateMapWithPart(path, stateMap, statePart),
        previous,
      },
      switchingState,
    );
  }
}
