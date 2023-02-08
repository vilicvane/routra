import {mergeStateMapWithPart} from '../@state';
import type {RouteSwitching, RouteTarget} from '../route';

import type {RouterSetResult, Router__} from './router';

export function createRouterBack(
  router: Router__,
  target: RouteTarget,
): RouterBack__ {
  return Object.setPrototypeOf((statePart: object = {}) => {
    const {path, stateMap, previous} = target;

    return router._set('back', {
      path,
      stateMap: mergeStateMapWithPart(path, stateMap, statePart),
      previous,
    });
  }, new RouterBackClass(router, target));
}

export interface RouterBack<TSwitchingState extends object>
  extends RouterBackClass<TSwitchingState> {
  (): RouterSetResult;
}

export type RouterBack__ = RouterBack<object>;

export class RouterBackClass<TSwitchingState extends object> {
  constructor(private router: Router__, private target: RouteTarget) {}

  $switch(switchingState?: TSwitchingState): RouteSwitching<TSwitchingState> {
    return this.router._switch('back', this.target, switchingState);
  }
}
