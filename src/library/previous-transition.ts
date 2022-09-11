import {runInAction} from 'mobx';

import type {__ViewEntry} from './@state';
import type {__Router} from './router';

export function _createPreviousTransition(
  router: __Router,
  activeEntry: __ViewEntry,
  transitionEntry: __ViewEntry,
): _PreviousTransition<unknown> {
  const transition: any = (transitionState: object) => {
    runInAction(() => {
      transitionEntry.transition!.observableState.set(transitionState);
    });
  };

  Object.setPrototypeOf(
    transition,
    new _PreviousTransitionObject(router, activeEntry, transitionEntry),
  );

  return transition;
}

export interface _PreviousTransition<TTransitionState>
  extends _PreviousTransitionObject {
  (state: TTransitionState): void;
}

export class _PreviousTransitionObject {
  constructor(
    readonly $router: __Router,
    private activeEntry: __ViewEntry,
    private transitionEntry: __ViewEntry,
  ) {}

  $back(): void {
    this.$router._back(this.activeEntry, this.transitionEntry);
  }

  $abort(): void {
    this.$router._abortTransition(this.transitionEntry);
  }
}
