import {runInAction} from 'mobx';

import {updateStateMapByPart} from './@state';
import type {Router__} from './router';
import type {Transition} from './transition';
import type {ViewEntry} from './view';

export type RouteOperationSetter = () => void;

export function createRouteOperation(
  router: Router__,
  targetEntry: ViewEntry,
  setter: RouteOperationSetter,
): RouteOperation_<unknown, unknown> {
  return Object.setPrototypeOf((statePart: object = {}) => {
    runInAction(() => {
      updateStateMapByPart(targetEntry.path, targetEntry.stateMap, statePart);
      setter();
    });
  }, new RouteOperationObject_(router, targetEntry, setter));
}

export interface RouteOperation_<TMergedState, TTransitionState>
  extends RouteOperationObject_<TMergedState, TTransitionState> {
  (statePart?: Partial<TMergedState>): void;
}

export class RouteOperationObject_<TMergedState, TTransitionState> {
  constructor(
    private router: Router__,
    private targetEntry: ViewEntry,
    private setter: RouteOperationSetter,
  ) {}

  $transition(
    statePart: Partial<TMergedState> = {},
    transitionState?: TTransitionState,
  ): Transition<TTransitionState> {
    return this.router._transition(
      this.targetEntry,
      statePart,
      transitionState,
      this.setter,
    );
  }
}

export function createRouteBack(
  router: Router__,
  targetEntry: ViewEntry,
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
    private targetEntry: ViewEntry,
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
