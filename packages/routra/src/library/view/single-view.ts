import {computed, runInAction} from 'mobx';

import type {RouteEntry, Route__} from '../route';

import type {ViewRouteMatch__} from './view';
import {AbstractView} from './view';
import {AbstractViewEntry} from './view-entry';

export class SingleView__ extends AbstractView<Route__> {
  private _entry: SingleViewEntry__ | undefined;

  @computed
  get _entries(): SingleViewEntry__[] {
    let entry = this._entry;

    if (this._matches.length === 0) {
      if (entry) {
        entry._dispose();
        entry = undefined;
        this._entry = undefined;
      }
    } else {
      if (!entry) {
        entry = new SingleViewEntry__(this);
        this._entry = entry;
      }
    }

    return entry ? [entry] : [];
  }
}

export class SingleViewEntry__ extends AbstractViewEntry<Route__> {
  private _blockedActive: RouteEntry | undefined;
  private _blockedTransition: RouteEntry | undefined;

  constructor(private _view: SingleView__) {
    super();
  }

  /** @internal */
  get _match(): ViewRouteMatch__ {
    return (this._active ?? this._transition)!;
  }

  protected get _entering(): boolean {
    const active = this._active;
    const transition = this._transition;

    return active === undefined && transition !== undefined;
  }

  protected get _leaving(): boolean {
    const active = this._active;

    return active !== undefined && active.entry.leaving;
  }

  @computed
  private get _active(): ViewRouteMatch__ | undefined {
    return this._view._matches.find(match => match.entry.active);
  }

  @computed
  private get _transition(): ViewRouteMatch__ | undefined {
    return this._view._matches.find(match => match.entry.transition);
  }

  /** @internal */
  override _dispose(): void {
    super._dispose();

    runInAction(() => {
      if (this._blockedActive) {
        this._blockedActive.updateTransitionBlock(this, {
          entering: false,
          leaving: false,
        });

        this._blockedActive = undefined;
      }

      if (this._blockedTransition) {
        this._blockedTransition.updateTransitionBlock(this, {
          entering: false,
          leaving: false,
        });

        this._blockedTransition = undefined;
      }
    });
  }

  protected _autorunUpdateTransitionBlock(): void {
    const blockedActive = this._blockedActive;
    const blockedTransition = this._blockedTransition;

    const active = this._active?.entry;
    const transition = this._transition?.entry;

    const enteringEnabled = this._enteringEnabled;
    const leavingEnabled = this._leavingEnabled;

    const entered = this._entered;
    const left = this._left;

    runInAction(() => {
      if (blockedActive && blockedActive !== active) {
        blockedActive.updateTransitionBlock(this, {
          entering: false,
          leaving: false,
        });
      }

      if (
        blockedTransition &&
        blockedTransition !== transition &&
        blockedTransition !== active
      ) {
        blockedTransition.updateTransitionBlock(this, {
          entering: false,
          leaving: false,
        });
      }

      this._blockedActive = undefined;
      this._blockedTransition = undefined;

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

        // Make sure to not block route if already left.
        const blocked = leavingEnabled && !left;

        if (blocked) {
          this._blockedActive = active;
        }

        active.updateTransitionBlock(this, {
          entering: false,
          leaving: blocked,
        });
      } else if (transition) {
        // Entering.

        // Make sure to not block route if already entered.
        const blocked = enteringEnabled && !entered;

        if (blocked) {
          this._blockedTransition = transition;
        }

        transition.updateTransitionBlock(this, {
          entering: blocked,
          leaving: false,
        });
      }
    });
  }
}
