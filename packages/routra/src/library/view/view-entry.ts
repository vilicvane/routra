import {autorun, computed, observable, runInAction} from 'mobx';

import {createMergedObjectProxy} from '../@utils.js';
import type {
  RouteMergedState_,
  RouteNodeClass__,
  RouteSwitchingState_,
} from '../route/index.js';
import type {RouterOperation} from '../router/index.js';

import type {ViewMatchEntry} from './view.js';

abstract class ViewEntryClass<TRoute extends RouteNodeClass__> {
  readonly $key = getNextViewEntryKey();

  @observable
  protected accessor _enteringEnabled = false;

  @observable
  protected accessor _leavingEnabled = false;

  @observable
  protected accessor _entered = false;

  @observable
  protected accessor _left = false;

  private _autorunDisposer: () => void;

  private enteringTransitionActivity: ViewTransitionActivity | undefined;

  private leavingTransitionActivity: ViewTransitionActivity | undefined;

  constructor() {
    this._autorunDisposer = autorun(() => this._autorunUpdateTransitionBlock());
  }

  get $entering(): ViewTransitionActivity | undefined {
    if (!this._entering) {
      return undefined;
    }

    let activity = this.enteringTransitionActivity;

    if (!activity) {
      const operation = this.$operation;

      activity = Object.freeze({
        $operation: operation,
        $complete: () => {
          if (!this._enteringEnabled) {
            return false;
          }

          if (!this._entered) {
            runInAction(() => {
              this._entered = true;
            });
          }

          return true;
        },
      });
    }

    return activity;
  }

  get $leaving(): ViewTransitionActivity | undefined {
    if (!this._leaving) {
      return undefined;
    }

    let activity = this.leavingTransitionActivity;

    if (!activity) {
      const operation = this.$match.$router._requireTransition().operation;

      activity = Object.freeze({
        $operation: operation,
        $complete: () => {
          if (!this._leavingEnabled) {
            return false;
          }

          if (!this._left) {
            runInAction(() => {
              this._left = true;
            });
          }

          return true;
        },
      });
    }

    return activity;
  }

  @computed
  get $switching(): ViewSwitchingActivity<TRoute> | undefined {
    const match = this._match;

    const route = match.route;

    const switchingTo = route._switching;

    if (switchingTo && match.entry === switchingTo.entry) {
      const shared = Object.freeze({
        $operation: switchingTo.operation,
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
        $operation: switchingFrom.operation,
        $rel: 'from',
      });

      return createMergedObjectProxy(() => [
        shared,
        switchingFrom.switchingStateObservable.get(),
      ]) as ViewSwitchingActivity<TRoute>;
    }

    return undefined;
  }

  get $match(): TRoute {
    return this._match.route;
  }

  abstract get $operation(): RouterOperation;

  /** @internal */
  abstract get _match(): ViewMatchEntry<TRoute>;

  protected abstract get _entering(): boolean;

  protected abstract get _leaving(): boolean;

  $transition = ({
    entering,
    leaving,
  }: ViewEntryRegisterTransitionOptions): void => {
    runInAction(() => {
      if (typeof entering === 'boolean') {
        this._enteringEnabled = entering;
      }

      if (typeof leaving === 'boolean') {
        this._leavingEnabled = leaving;
      }
    });
  };

  /** @internal */
  _dispose(): void {
    this._autorunDisposer();
  }

  protected abstract _autorunUpdateTransitionBlock(): void;
}

export const AbstractViewEntry = ViewEntryClass;

export type IViewEntry<TRoute extends RouteNodeClass__> =
  ViewEntryClass<TRoute>;

export type ViewEntry<TRoute extends RouteNodeClass__> =
  ViewEntryClass<TRoute> & RouteMergedState_<TRoute>;

export type ViewEntry__ = ViewEntry<RouteNodeClass__>;

export type ViewEntryRegisterTransitionOptions = {
  entering?: boolean;
  leaving?: boolean;
};

export type ViewTransitionActivity = {
  $operation: RouterOperation;
  $complete(): boolean;
};

export type ViewSwitchingRelationship = 'from' | 'to';

export type ViewSwitchingActivity<TRoute extends RouteNodeClass__> =
  RouteSwitchingState_<TRoute> & {
    $operation: RouterOperation;
    $rel: ViewSwitchingRelationship;
  };

let lastViewEntryKey = 0;

function getNextViewEntryKey(): number {
  return ++lastViewEntryKey;
}
