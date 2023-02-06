import {mergeStateMapWithPart} from '../@state';
import type {RouterOperation, Router__} from '../router';

import type {RouteTarget} from './route-entry';
import type {RouteSwitching} from './route-switching';

export function createRouteOperation(
  router: Router__,
  operation: RouterOperation,
  target: RouteTarget,
): RouteOperation_<unknown, unknown> {
  // E.g.: router.home.$push();
  return Object.setPrototypeOf((statePart: object = {}) => {
    const {path, stateMap, previous} = target;

    router._set(operation, {
      path,
      stateMap: mergeStateMapWithPart(path, stateMap, statePart),
      previous,
    });
  }, new RouteOperationObject_(router, operation, target));
}

export interface RouteOperation_<TMergedState, TSwitchingState>
  extends RouteOperationObject_<TMergedState, TSwitchingState> {
  (statePart?: Partial<TMergedState>): void;
}

export class RouteOperationObject_<TMergedState, TSwitchingState> {
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

export function createRouteBack(
  router: Router__,
  target: RouteTarget,
): RouteBack_<unknown> {
  return Object.setPrototypeOf((statePart: object = {}) => {
    const {path, stateMap, previous} = target;

    router._set('back', {
      path,
      stateMap: mergeStateMapWithPart(path, stateMap, statePart),
      previous,
    });
  }, new RouteBackObject_(router, target));
}

export interface RouteBack_<TSwitchingState>
  extends RouteBackObject_<TSwitchingState> {
  (): void;
}

export class RouteBackObject_<TSwitchingState> {
  constructor(private router: Router__, private target: RouteTarget) {}

  $switch(switchingState?: TSwitchingState): RouteSwitching<TSwitchingState> {
    return this.router._switch('back', this.target, switchingState);
  }
}
