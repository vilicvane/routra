import {observable, runInAction} from 'mobx';

import type {Router__} from './router';

export class RouteEntry {
  private enteringSet = observable.set<object>();

  private leavingSet = observable.set<object>();

  constructor(
    readonly router: Router__,
    readonly path: string[],
    readonly stateMap: Map<number, object>,
    readonly previous: RouteTarget | undefined,
  ) {}

  get blockedByEntering(): boolean {
    return this.enteringSet.size > 0;
  }

  get blockedByLeaving(): boolean {
    return this.leavingSet.size > 0;
  }

  get active(): boolean {
    return this === this.router._active;
  }

  get transition(): boolean {
    return this === this.router._transition;
  }

  get switchingFrom(): boolean {
    return this.active && this.router._switching !== undefined;
  }

  get switchingTo(): boolean {
    return this === this.router._switching?.to;
  }

  get leaving(): boolean {
    return this.active && this.router._transition !== undefined;
  }

  updateTransitionBlock(
    ref: object,
    {entering, leaving}: RouteEntryRegisterTransitionOptions,
  ): void {
    runInAction(() => {
      if (entering) {
        this.enteringSet.add(ref);
      } else {
        this.enteringSet.delete(ref);
      }

      if (leaving) {
        this.leavingSet.add(ref);
      } else {
        this.leavingSet.delete(ref);
      }
    });
  }
}

/** @internal */
export interface RouteEntryRegisterTransitionOptions {
  entering: boolean;
  leaving: boolean;
}

export interface RouteTarget {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteTarget | undefined;
}
