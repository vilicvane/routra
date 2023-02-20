import {computed, runInAction} from 'mobx';

import type {RouteEntry, RouteNodeClass__} from '../route';
import type {RouterOperation} from '../router';

import type {ViewMatchEntry__} from './view';
import {AbstractView} from './view';
import {AbstractViewEntry} from './view-entry';

export class ParallelView__ extends AbstractView<RouteNodeClass__> {
  private _routeEntryToViewEntryMap = new Map<
    RouteEntry,
    ParallelViewEntry__
  >();

  @computed
  get _entries(): ParallelViewEntry__[] {
    const matches = this._matches;

    const routeEntryToViewEntryMap = this._routeEntryToViewEntryMap;

    const pendingIteratingRouteEntries = new Set(
      routeEntryToViewEntryMap.keys(),
    );

    for (const match of matches) {
      const {entry} = match;

      pendingIteratingRouteEntries.delete(entry);

      if (routeEntryToViewEntryMap.has(entry)) {
        continue;
      }

      routeEntryToViewEntryMap.set(entry, new ParallelViewEntry__(match));
    }

    for (const routeEntry of pendingIteratingRouteEntries) {
      const viewEntry = routeEntryToViewEntryMap.get(routeEntry)!;

      viewEntry._dispose();

      routeEntryToViewEntryMap.delete(routeEntry);
    }

    return Array.from(routeEntryToViewEntryMap.values());
  }
}

export class ParallelViewEntry__ extends AbstractViewEntry<RouteNodeClass__> {
  /** @internal */
  readonly _match: ViewMatchEntry__;

  readonly $operation: RouterOperation;

  constructor(match: ViewMatchEntry__) {
    super();

    this._match = match;
    this.$operation = match.operation;
  }

  protected get _entering(): boolean {
    return this._match.entry.transition;
  }

  protected get _leaving(): boolean {
    return this._match.entry.leaving;
  }

  /** @internal */
  override _dispose(): void {
    super._dispose();

    runInAction(() => {
      this._match.entry.updateTransitionBlock(this, {
        entering: false,
        leaving: false,
      });
    });
  }

  protected _autorunUpdateTransitionBlock(): void {
    const enteringEnabled = this._enteringEnabled;
    const leavingEnabled = this._leavingEnabled;

    const entered = this._entered;
    const left = this._left;

    runInAction(() => {
      this._match.entry.updateTransitionBlock(this, {
        entering: enteringEnabled && !entered,
        leaving: leavingEnabled && !left,
      });
    });
  }
}
