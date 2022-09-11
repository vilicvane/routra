import {runInAction} from 'mobx';

import type {__ViewEntry} from './@state';
import type {__Router} from './router';

export function _createTransition(
  router: __Router,
  activeEntry: __ViewEntry,
  transitionEntry: __ViewEntry,
  newStateMap: Map<string, object>,
): _Transition<unknown> {
  const transition: any = (transitionState: object) => {
    runInAction(() => {
      transitionEntry.transition!.observableState.set(transitionState);
    });
  };

  Object.setPrototypeOf(
    transition,
    new _TransitionObject(router, activeEntry, transitionEntry, newStateMap),
  );

  return transition;
}

export interface _Transition<TTransitionState> extends _TransitionObject {
  (state: TTransitionState): void;
}

export class _TransitionObject {
  constructor(
    readonly $router: __Router,
    private activeEntry: __ViewEntry,
    private transitionEntry: __ViewEntry,
    private newStateMap: Map<string, object>,
  ) {}

  $push(): void {
    const transitionEntry = this.transitionEntry;
    const {path, transition} = transitionEntry;

    this.$router._push(
      {
        path,
        newStateMap: this.newStateMap,
        newStatePart: transition!.newStatePart,
      },
      this.activeEntry,
      transitionEntry,
    );
  }

  $replace(): void {
    const transitionEntry = this.transitionEntry;
    const {path, transition} = transitionEntry;

    this.$router._replace(
      {
        path,
        newStateMap: this.newStateMap,
        newStatePart: transition!.newStatePart,
      },
      this.activeEntry,
      transitionEntry,
    );
  }

  $abort(): void {
    this.$router._abortTransition(this.transitionEntry);
  }
}
