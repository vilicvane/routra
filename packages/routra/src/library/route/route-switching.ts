import type {IObservableValue} from 'mobx';
import {runInAction} from 'mobx';

import type {Router__} from '../router/index.js';

export function createRouteSwitching(
  router: Router__,
  switchingStateObservable: IObservableValue<unknown>,
  ref: object,
): RouteSwitching__ {
  return Object.setPrototypeOf(
    (switchingState: object) => {
      runInAction(() => {
        switchingStateObservable.set(switchingState);
      });
    },
    new RouteSwitchingObject(router, ref),
  );
}

export type RouteSwitching<TSwitchingState extends object> =
  RouteSwitchingObject &
    {
      bivariance(state: TSwitchingState): void;
    }['bivariance'];

export type RouteSwitching__ = RouteSwitching<object>;

export class RouteSwitchingObject {
  constructor(
    private router: Router__,
    private ref: object,
  ) {}

  $complete(): void {
    this.router._completeSwitching(this.ref);
  }

  $abort(): void {
    this.router._abortSwitching(this.ref);
  }
}
