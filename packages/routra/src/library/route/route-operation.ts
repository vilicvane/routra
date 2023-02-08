import {mergeStateMapWithPart} from '../@state';
import type {RouterOperation, RouterSetResult, Router__} from '../router';

import type {RouteTarget} from './route-entry';
import type {RouteSwitching_} from './route-switching';

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
  ): RouteSwitching_<TSwitchingState> {
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

export function createRouteBack(
  router: Router__,
  target: RouteTarget,
): RouteBack__ {
  return Object.setPrototypeOf((statePart: object = {}) => {
    const {path, stateMap, previous} = target;

    return router._set('back', {
      path,
      stateMap: mergeStateMapWithPart(path, stateMap, statePart),
      previous,
    });
  }, new RouteBackClass(router, target));
}

export interface RouteBack_<TSwitchingState extends object>
  extends RouteBackClass<TSwitchingState> {
  (): RouterSetResult;
}

export type RouteBack__ = RouteBack_<object>;

export class RouteBackClass<TSwitchingState extends object> {
  constructor(private router: Router__, private target: RouteTarget) {}

  $switch(switchingState?: TSwitchingState): RouteSwitching_<TSwitchingState> {
    return this.router._switch('back', this.target, switchingState);
  }
}
