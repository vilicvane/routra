import {runInAction} from 'mobx';

import type {__ViewEntry} from './@state';
import {updateStateMapByPart} from './@state';
import type {__Router} from './router';
import type {_Transition} from './transition';
import {_createTransition} from './transition';

export type RouteOperationSetter = (obsoleteEntries: __ViewEntry[]) => void;

export function _createRouteOperation(
  router: __Router,
  targetEntry: __ViewEntry,
  setter: RouteOperationSetter,
): _RouteOperation<unknown, unknown> {
  return Object.setPrototypeOf((statePart: object = {}) => {
    runInAction(() => {
      updateStateMapByPart(targetEntry.path, targetEntry.stateMap, statePart);
      setter([]);
    });
  }, new _RouteOperationObject(router, targetEntry, setter));
}

export interface _RouteOperation<TMergedState, TTransitionState>
  extends _RouteOperationObject<TMergedState, TTransitionState> {
  (statePart?: Partial<TMergedState>): void;
}

export class _RouteOperationObject<TMergedState, TTransitionState> {
  constructor(
    private router: __Router,
    private targetEntry: __ViewEntry,
    private setter: RouteOperationSetter,
  ) {}

  $transition(
    statePart: Partial<TMergedState> = {},
    transitionState?: TTransitionState,
  ): _Transition<TTransitionState> {
    return this.router._transition(
      this.targetEntry,
      statePart,
      transitionState,
      this.setter,
    );
  }
}

export function _createRouteBack(
  router: __Router,
  targetEntry: __ViewEntry,
  setter: RouteOperationSetter,
): _RouteBack<unknown> {
  return Object.setPrototypeOf((statePart: object = {}) => {
    runInAction(() => {
      updateStateMapByPart(targetEntry.path, targetEntry.stateMap, statePart);
      setter([]);
    });
  }, new _RouteBackObject(router, targetEntry, setter));
}

export interface _RouteBack<TTransitionState>
  extends _RouteBackObject<TTransitionState> {
  (): void;
}

export class _RouteBackObject<TTransitionState> {
  constructor(
    private router: __Router,
    private targetEntry: __ViewEntry,
    private setter: RouteOperationSetter,
  ) {}

  $transition(
    transitionState?: TTransitionState,
  ): _Transition<TTransitionState> {
    return this.router._transition(
      this.targetEntry,
      {},
      transitionState,
      this.setter,
    );
  }
}
