import {observable, runInAction} from 'mobx';

import {mergeStateMapWithPart} from '../@state.js';
import {createMergedObjectProxy} from '../@utils.js';
import type {Router__} from '../router/index.js';

export class RouteEntry {
  private enteringSet = observable.set<object>();

  private leavingSet = observable.set<object>();

  private states: object[];

  private pendingStatePart: object | undefined;

  readonly mergedState: object;

  constructor(
    readonly router: Router__,
    readonly path: string[],
    readonly stateMap: Map<number, object>,
    readonly previous: RouteTarget | undefined,
    pendingStatePart: object | undefined,
  ) {
    this.states = Array.from(path.keys(), index => stateMap.get(index))
      .filter((state): state is object => state !== undefined)
      .reverse();

    this.pendingStatePart = pendingStatePart;

    this.mergedState = createMergedObjectProxy(() => {
      const {states, pendingStatePart} = this;
      return pendingStatePart ? [pendingStatePart, ...states] : states;
    });
  }

  get target(): RouteTarget {
    return {
      path: this.path,
      stateMap: this.stateMap,
      previous: this.previous,
      statePart: this.pendingStatePart ?? {},
    };
  }

  get blockedByEntering(): boolean {
    return this.enteringSet.size > 0;
  }

  get blockedByLeaving(): boolean {
    return this.leavingSet.size > 0;
  }

  get active(): boolean {
    return this === this.router._active?.entry;
  }

  get transition(): boolean {
    return this === this.router._transition?.entry;
  }

  get switching(): boolean {
    return this === this.router._switching?.entry;
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

  mergePendingStatePart(): void {
    const pendingStatePart = this.pendingStatePart;

    if (!pendingStatePart) {
      return;
    }

    runInAction(() => {
      mergeStateMapWithPart(this.path, this.stateMap, pendingStatePart);

      this.pendingStatePart = undefined;
    });
  }
}

/** @internal */
export type RouteEntryRegisterTransitionOptions = {
  entering: boolean;
  leaving: boolean;
};

export type RouteTarget = {
  path: string[];
  stateMap: Map<number, object>;
  previous: RouteTarget | undefined;
  statePart: object | undefined;
};
