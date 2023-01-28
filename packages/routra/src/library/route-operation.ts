import {runInAction} from 'mobx';

import {mergeStateMapWithPart} from './@state';
import type {RouteEntry} from './route';
import type {RouteTarget, Router__} from './router';
import type {Transition} from './transition';

export type RouteOperationSetter = (entry: RouteEntry) => void;

export function createRouteOperation(
  router: Router__,
  options: RouteTarget,
): RouteOperation_<unknown, unknown> {
  // E.g.: router.home.$push();
  return Object.setPrototypeOf((statePart: object = {}) => {
    const {path, stateMap, previous} = options;

    router._set({
      path,
      stateMap: mergeStateMapWithPart(path, stateMap, statePart),
      previous,
    });
  }, new RouteOperationObject_(router, options));
}

export interface RouteOperation_<TMergedState, TTransitionState>
  extends RouteOperationObject_<TMergedState, TTransitionState> {
  (statePart?: Partial<TMergedState>): void;
}

export class RouteOperationObject_<TMergedState, TTransitionState> {
  constructor(private router: Router__, private options: RouteTarget) {}

  $transition(
    statePart: Partial<TMergedState> = {},
    transitionState?: TTransitionState,
  ): Transition<TTransitionState> {
    return this.router._transition(
      this.options,
      statePart,
      transitionState,
      this.setter,
    );
  }
}

export function createRouteBack(
  router: Router__,
  targetEntry: RouteEntry,
  setter: RouteOperationSetter,
): RouteBack_<unknown> {
  return Object.setPrototypeOf((statePart: object = {}) => {
    runInAction(() => {
      updateStateMapByPart(targetEntry.path, targetEntry.stateMap, statePart);
      setter();
    });
  }, new RouteBackObject_(router, targetEntry, setter));
}

export interface RouteBack_<TTransitionState>
  extends RouteBackObject_<TTransitionState> {
  (): void;
}

export class RouteBackObject_<TTransitionState> {
  constructor(
    private router: Router__,
    private targetEntry: RouteEntry,
    private setter: RouteOperationSetter,
  ) {}

  $transition(
    transitionState?: TTransitionState,
  ): Transition<TTransitionState> {
    return this.router._transition(
      this.targetEntry,
      {},
      transitionState,
      this.setter,
    );
  }
}
