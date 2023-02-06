import {computed, runInAction} from 'mobx';

import type {RouteEntry} from '../route-entry';

import {AbstractView} from './view';
import {AbstractViewEntry} from './view-entry';

export class SingleView extends AbstractView {
  private _entry: SingleViewEntry | undefined;

  @computed
  get $entries(): SingleViewEntry[] {
    let entry = this._entry;

    if (this._matches.length === 0) {
      if (entry) {
        entry._dispose();
        entry = undefined;
        this._entry = undefined;
      }
    } else {
      if (!entry) {
        entry = new SingleViewEntry(this);
        this._entry = entry;
      }
    }

    return entry ? [entry] : [];
  }
}

export class SingleViewEntry extends AbstractViewEntry {
  private _blockedActive: RouteEntry | undefined;
  private _blockedTransition: RouteEntry | undefined;

  constructor(private _view: SingleView) {
    super();
  }

  protected get _entering(): boolean {
    const active = this._active;
    const transition = this._transition;

    return active === undefined && transition !== undefined;
  }

  protected get _leaving(): boolean {
    const active = this._active;

    return active !== undefined && active.leaving;
  }

  @computed
  private get _active(): RouteEntry | undefined {
    return this._view._matches.find(match => match.active);
  }

  @computed
  private get _transition(): RouteEntry | undefined {
    return this._view._matches.find(match => match.transition);
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

    const active = this._active;
    const transition = this._transition;

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
