import type {__ViewEntry} from './@state';
import type {_PreviousTransition} from './previous-transition';
import type {__Router} from './router';

export class PreviousRoute<TTransitionState> {
  constructor(readonly $router: __Router, private _activeEntry: __ViewEntry) {}

  $back(): void {
    this.$router._back(this._activeEntry);
  }

  $transition(
    transitionState: TTransitionState,
  ): _PreviousTransition<TTransitionState> {
    return this.$router._previousTransition(this._activeEntry, transitionState);
  }
}
