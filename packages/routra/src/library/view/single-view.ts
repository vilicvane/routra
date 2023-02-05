import {autorun, computed, observable, runInAction} from 'mobx';

import type {Route__} from '../route';
import type {RouteEntry} from '../route-entry';

import type {
  IViewEntry,
  IViewTransition,
  ViewEntryRegisterTransitionOptions,
} from './view';
import {AbstractView, getNextViewEntryKey} from './view';

export class SingleView extends AbstractView {
  @observable.ref
  private _entry: SingleViewEntry | undefined;

  constructor(routes: Route__[]) {
    super(routes);

    autorun(() => {
      const matches = this.matches;

      let entry = this._entry;

      if (matches.length === 0) {
        if (entry) {
          runInAction(() => {
            entry!._dispose();
            this._entry = undefined;
          });
        }
      } else {
        const active = matches.find(match => match.active);

        const transition = matches.find(match => !match.active);

        runInAction(() => {
          if (!entry) {
            entry = new SingleViewEntry();
            this._entry = entry;
          }

          entry._update(active, transition);
        });
      }
    });
  }

  get $entries(): SingleViewEntry[] {
    const entry = this._entry;

    return entry ? [entry] : [];
  }
}

export class SingleViewEntry implements IViewEntry {
  readonly $key = getNextViewEntryKey();

  private _enteringEnabled = false;
  private _leavingEnabled = false;

  private _entered = false;
  private _left = false;

  private _active: RouteEntry | undefined;

  private _transition: RouteEntry | undefined;

  private _viewTransition: IViewTransition | undefined;

  $transition(): IViewTransition {
    let viewTransition = this._viewTransition;

    if (!viewTransition) {
      const that = this;

      viewTransition = observable(
        {
          get entering() {
            const active = that._active;
            const transition = that._transition;

            if (!active && transition) {
              return {
                complete() {
                  if (!that._enteringEnabled) {
                    throw new Error('Entering transition is not enabled');
                  }

                  if (that._entered) {
                    return;
                  }

                  that._entered = true;

                  runInAction(() => {
                    transition.updateTransitionBlock(that, {
                      entering: false,
                      leaving: false,
                    });
                  });
                },
              };
            }

            return false;
          },
          get leaving() {
            const active = that._active;
            const transition = that._transition;

            if (active && !transition && active.leaving) {
              return {
                complete() {
                  if (!that._leavingEnabled) {
                    throw new Error('Leaving transition is not enabled');
                  }

                  if (that._left) {
                    return;
                  }

                  that._left = true;

                  runInAction(() => {
                    active.updateTransitionBlock(that, {
                      entering: false,
                      leaving: false,
                    });
                  });
                },
              };
            }

            return false;
          },
          register({entering = false, leaving = false}) {
            that._registerTransition({entering, leaving});
          },
        },
        {
          entering: computed,
          leaving: computed,
        },
      );
    }

    return viewTransition;
  }

  _registerTransition({
    entering,
    leaving,
  }: ViewEntryRegisterTransitionOptions): void {
    this._enteringEnabled = entering;
    this._leavingEnabled = leaving;

    runInAction(() => {
      this._updateTransitionBlock(this._active, this._transition);
    });
  }

  /** @internal */
  _update(
    active: RouteEntry | undefined,
    transition: RouteEntry | undefined,
  ): void {
    runInAction(() => {
      this._active?.updateTransitionBlock(this, {
        entering: false,
        leaving: false,
      });

      this._transition?.updateTransitionBlock(this, {
        entering: false,
        leaving: false,
      });

      this._active = active;
      this._transition = transition;

      this._updateTransitionBlock(active, transition);
    });
  }

  _dispose(): void {
    runInAction(() => {
      this._active?.updateTransitionBlock(this, {
        entering: false,
        leaving: false,
      });

      this._transition?.updateTransitionBlock(this, {
        entering: false,
        leaving: false,
      });

      this._active = undefined;
      this._transition = undefined;
    });
  }

  private _updateTransitionBlock(
    active: RouteEntry | undefined,
    transition: RouteEntry | undefined,
  ): void {
    if (active && transition) {
      // Transition going on, but treated as stable for single view.

      active.updateTransitionBlock(this, {
        entering: false,
        leaving: false,
      });

      transition.updateTransitionBlock(this, {
        entering: false,
        leaving: false,
      });
    } else if (active) {
      // Stable or leaving.

      active.updateTransitionBlock(this, {
        entering: false,
        // Make sure to not block route if already left.
        leaving: this._leavingEnabled && !this._left,
      });
    } else if (transition) {
      // Entering.

      transition.updateTransitionBlock(this, {
        // Make sure to not block route if already entered.
        entering: this._enteringEnabled && !this._entered,
        leaving: false,
      });
    }
  }
}
