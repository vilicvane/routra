import {autorun, makeObservable, observable, runInAction} from 'mobx';

import type {RouteMergedState_, Route__} from '../route';

import type {ViewRouteMatch, ViewRouteMatch__} from './view';

abstract class ViewEntryClass<TRoute extends Route__> {
  readonly $key = getNextViewEntryKey();

  @observable
  protected _enteringEnabled = false;

  @observable
  protected _leavingEnabled = false;

  @observable
  protected _entered = false;

  @observable
  protected _left = false;

  private _autorunDisposer: () => void;

  constructor() {
    makeObservable(this);

    this._autorunDisposer = autorun(() => this._autorunUpdateTransitionBlock());
  }

  get $entering(): ViewTransitionActivity | false {
    if (!this._entering) {
      return false;
    }

    const that = this;

    return {
      complete(): void {
        if (!that._enteringEnabled) {
          throw new Error('Entering transition is not enabled');
        }

        if (that._entered) {
          return;
        }

        runInAction(() => {
          that._entered = true;
        });
      },
    };
  }

  get $leaving(): ViewTransitionActivity | false {
    if (!this._leaving) {
      return false;
    }

    const that = this;

    return {
      complete(): void {
        if (!that._leavingEnabled) {
          throw new Error('Leaving transition is not enabled');
        }

        if (that._left) {
          return;
        }

        runInAction(() => {
          that._left = true;
        });
      },
    };
  }

  get $match(): TRoute {
    return this._match.route;
  }

  abstract get _match(): ViewRouteMatch<TRoute>;

  protected abstract get _entering(): boolean;

  protected abstract get _leaving(): boolean;

  $transition({entering, leaving}: ViewEntryRegisterTransitionOptions): void {
    runInAction(() => {
      this._enteringEnabled = entering;
      this._leavingEnabled = leaving;
    });
  }

  /** @internal */
  _dispose(): void {
    this._autorunDisposer();
  }

  protected abstract _autorunUpdateTransitionBlock(): void;
}

export const AbstractViewEntry = ViewEntryClass;

export type IViewEntry<TRoute extends Route__> = ViewEntryClass<TRoute>;

export type ViewEntry<TRoute extends Route__> = ViewEntryClass<TRoute> &
  RouteMergedState_<TRoute>;

export interface ViewEntryRegisterTransitionOptions {
  entering: boolean;
  leaving: boolean;
}

export interface ViewTransitionActivity {
  complete(): void;
}

let lastViewEntryKey = 0;

function getNextViewEntryKey(): number {
  return ++lastViewEntryKey;
}
