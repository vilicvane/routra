import type {IObservableValue} from 'mobx';
import {runInAction} from 'mobx';

import type {Router__} from '../router';

export function createRouteSwitching(
  router: Router__,
  switchingStateObservable: IObservableValue<unknown>,
  ref: object,
): RouteSwitching__ {
  return Object.setPrototypeOf((switchingState: object) => {
    runInAction(() => {
      switchingStateObservable.set(switchingState);
    });
  }, new RouteSwitchingObject(router, ref));
}

export interface RouteSwitching<TSwitchingState extends object>
  extends RouteSwitchingObject {
  (state: TSwitchingState): void;
}

export type RouteSwitching__ = RouteSwitching<object>;

export class RouteSwitchingObject {
  constructor(private router: Router__, private ref: object) {}

  $complete(): void {
    this.router._completeSwitching(this.ref);
  }

  $abort(): void {
    this.router._abortSwitching(this.ref);
  }
}
