import {computed, makeObservable} from 'mobx';

import type {Route__} from '../route';
import type {RouteEntry} from '../route-entry';

import type {IViewEntry} from './view-entry';

abstract class View {
  constructor(readonly routes: Route__[]) {
    makeObservable(this);
  }

  abstract get $entries(): IViewEntry[];

  /** @internal */
  @computed
  get _matches(): RouteEntry[] {
    return this.routes
      .flatMap(route => [route.$active, route.$transition])
      .filter((match): match is RouteEntry => !!match);
  }
}

export const AbstractView = View;
export type IView = View;
