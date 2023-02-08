import {autorun, computed, makeObservable, observable, runInAction} from 'mobx';

import {createMergedObjectProxy} from '../@utils';
import type {
  RouteMergedState_,
  RouteNode__,
  RouteSwitchingState_,
} from '../route';

import type {ViewRouteMatch} from './view';

abstract class ViewEntryClass<TRoute extends RouteNode__> {
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

  private enteringTransitionActivity: ViewTransitionActivity = {
    $complete: () => {
      if (!this._enteringEnabled) {
        throw new Error('Entering transition is not enabled');
      }

      if (this._entered) {
        return;
      }

      runInAction(() => {
        this._entered = true;
      });
    },
  };

  private leavingTransitionActivity: ViewTransitionActivity = {
    $complete: () => {
      if (!this._leavingEnabled) {
        throw new Error('Leaving transition is not enabled');
      }

      if (this._left) {
        return;
      }

      runInAction(() => {
        this._left = true;
      });
    },
  };

  constructor() {
    makeObservable(this);

    this._autorunDisposer = autorun(() => this._autorunUpdateTransitionBlock());
  }

  get $entering(): ViewTransitionActivity | false {
    return this._entering ? this.enteringTransitionActivity : false;
  }

  get $leaving(): ViewTransitionActivity | false {
    return this._leaving ? this.leavingTransitionActivity : false;
  }

  @computed
  get $switching(): ViewSwitchingActivity<TRoute> | false {
    const route = this._match.route;

    const switchingTo = route._switching;

    if (switchingTo) {
      const shared = Object.freeze({
        $rel: 'to',
      });

      return createMergedObjectProxy(() => [
        shared,
        switchingTo.switchingStateObservable.get(),
      ]) as ViewSwitchingActivity<TRoute>;
    }

    const switchingFrom = route.$router._switching;

    if (route.$active && switchingFrom) {
      const shared = Object.freeze({
        $rel: 'from',
      });

      return createMergedObjectProxy(() => [
        shared,
        switchingFrom.switchingStateObservable.get(),
      ]) as ViewSwitchingActivity<TRoute>;
    }

    return false;
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

export type IViewEntry<TRoute extends RouteNode__> = ViewEntryClass<TRoute>;

export type ViewEntry<TRoute extends RouteNode__> = ViewEntryClass<TRoute> &
  RouteMergedState_<TRoute>;

export type ViewEntry__ = ViewEntry<RouteNode__>;

export interface ViewEntryRegisterTransitionOptions {
  entering: boolean;
  leaving: boolean;
}

export interface ViewTransitionActivity {
  $complete(): void;
}

export type ViewSwitchingRelationship = 'from' | 'to';

export type ViewSwitchingActivity<TRoute extends RouteNode__> =
  RouteSwitchingState_<TRoute> & {
    $rel: ViewSwitchingRelationship;
  };

let lastViewEntryKey = 0;

function getNextViewEntryKey(): number {
  return ++lastViewEntryKey;
}
