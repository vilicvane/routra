import {computed, runInAction} from 'mobx';

import type {RouteEntry} from '../route-entry';

import {AbstractView} from './view';
import {AbstractViewEntry} from './view-entry';

export class ParallelView extends AbstractView {
  private _routeEntryToViewEntryMap = new Map<RouteEntry, ParallelViewEntry>();

  @computed
  get $entries(): ParallelViewEntry[] {
    const matches = this._matches;

    const routeEntryToViewEntryMap = this._routeEntryToViewEntryMap;

    const pendingIteratingRouteEntries = new Set(
      routeEntryToViewEntryMap.keys(),
    );

    for (const routeEntry of matches) {
      pendingIteratingRouteEntries.delete(routeEntry);

      if (routeEntryToViewEntryMap.has(routeEntry)) {
        continue;
      }

      routeEntryToViewEntryMap.set(
        routeEntry,
        new ParallelViewEntry(routeEntry),
      );
    }

    for (const routeEntry of pendingIteratingRouteEntries) {
      const viewEntry = routeEntryToViewEntryMap.get(routeEntry)!;

      viewEntry._dispose();

      routeEntryToViewEntryMap.delete(routeEntry);
    }

    return Array.from(routeEntryToViewEntryMap.values());
  }
}

export class ParallelViewEntry extends AbstractViewEntry {
  constructor(private _match: RouteEntry) {
    super();
  }

  protected get _entering(): boolean {
    return this._match.transition;
  }

  protected get _leaving(): boolean {
    return this._match.leaving;
  }

  override _dispose(): void {
    super._dispose();

    runInAction(() => {
      this._match.updateTransitionBlock(this, {
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
      this._match.updateTransitionBlock(this, {
        entering: enteringEnabled && !entered,
        leaving: leavingEnabled && !left,
      });
    });
  }
}
