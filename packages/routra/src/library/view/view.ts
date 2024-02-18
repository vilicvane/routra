import {computed} from 'mobx';

import {createMergedObjectProxy} from '../@utils.js';
import type {RouteNodeClass__} from '../route/index.js';
import type {MatchEntry} from '../router/index.js';

import type {IViewEntry, ViewEntry} from './view-entry.js';

abstract class View<TRoute extends RouteNodeClass__> {
  private _mergedEntryMap = new WeakMap<
    IViewEntry<TRoute>,
    ViewEntry<TRoute>
  >();

  constructor(readonly $routes: TRoute[]) {}

  /** @internal */
  abstract get _entries(): IViewEntry<TRoute>[];

  get $entries(): ViewEntry<TRoute>[] {
    const mergedEntryMap = this._mergedEntryMap;

    return this._entries.map(entry => {
      let mergedEntry = mergedEntryMap.get(entry);

      if (mergedEntry) {
        return mergedEntry;
      }

      mergedEntry = createMergedObjectProxy([
        entry,
        entry._match.entry.mergedState,
      ]) as ViewEntry<TRoute>;

      mergedEntryMap.set(entry, mergedEntry!);

      return mergedEntry!;
    });
  }

  /** @internal */
  @computed
  get _matches(): ViewMatchEntry<TRoute>[] {
    return this.$routes
      .flatMap((route): (ViewMatchEntry<TRoute> | undefined)[] => {
        const active = route._active;
        const transition = route._transition;
        const switching = route._switching;

        return [
          active && {route, ...active},
          transition && {route, ...transition},
          switching && {route, ...switching},
        ];
      })
      .filter(
        <T>(match: T): match is Exclude<T, undefined> => match !== undefined,
      );
  }
}

export const AbstractView = View;

export type IView<TRoute extends RouteNodeClass__> = View<TRoute>;

export type IView__ = IView<RouteNodeClass__>;

export type ViewMatchEntry<TRoute extends RouteNodeClass__> = MatchEntry & {
  route: TRoute;
};

export type ViewMatchEntry__ = ViewMatchEntry<RouteNodeClass__>;
