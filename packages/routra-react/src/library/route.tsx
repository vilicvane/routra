import {computed, makeObservable, observable, runInAction} from 'mobx';
import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component, createContext} from 'react';
import type {IView, RouteNode__, RouteView} from 'routra';

const STABLE_OPTION_DEFAULT = false;
const SINGLE_OPTION_DEFAULT = false;
const LEAVING_OPTION_DEFAULT = false;

export interface RouteContext {
  route: RouteNode__;
  view: IView<unknown>;
}

export const RouteContext = createContext<RouteContext>(undefined!);

export interface RouteComponentLeaving {
  $complete(): void;
}

export interface RouteComponentProps<TRoute extends RouteNode__> {
  route: TRoute;
  view: NonNullable<RouteView<TRoute>>;
  leaving: RouteComponentLeaving | false;
}

export interface RouteProps<TRoute extends RouteNode__> {
  match: TRoute;
  exact?: boolean;
  stable?: boolean;
  single?: boolean;
  leaving?: boolean;
  component: ComponentType<RouteComponentProps<TRoute>>;
}

@observer
export class Route<TRoute extends RouteNode__> extends Component<
  RouteProps<TRoute>
> {
  private _viewToEntryMap = new Map<RouteView<TRoute>, RouteViewEntry>();

  @observable
  private tick = 0;

  constructor(props: RouteProps<TRoute>) {
    super(props);

    makeObservable(this);
  }

  @computed
  private get viewEntries(): RouteViewEntry[] {
    const {
      match,
      stable = STABLE_OPTION_DEFAULT,
      single = SINGLE_OPTION_DEFAULT,
      leaving: leavingEnabled = LEAVING_OPTION_DEFAULT,
    } = this.props;

    void this.tick;

    const viewToEntryMap = this._viewToEntryMap;

    let matchedViews = match.$views;

    if (stable) {
      matchedViews = matchedViews.filter(
        view => view.$transition === undefined,
      );
    }

    if (single) {
      if (matchedViews.length > 1) {
        matchedViews = [
          matchedViews.find(view => view.$transition === undefined) ??
            matchedViews[0],
        ];
      }
    }

    const pendingIteratingMatchedViewSet = new Set(matchedViews);

    for (const [view, entry] of viewToEntryMap) {
      // The view is active if found in the matched views.
      const active = pendingIteratingMatchedViewSet.delete(view);

      if (active) {
        // No update needed for this view entry.
        continue;
      }

      if (leavingEnabled && !single) {
        viewToEntryMap.set(view, {
          ...entry,
          leaving: {
            $complete: () => {
              viewToEntryMap.delete(view);

              runInAction(() => {
                this.tick++;
              });
            },
          },
        });
      } else {
        viewToEntryMap.delete(view);
      }
    }

    for (const view of pendingIteratingMatchedViewSet) {
      // Add view to `viewToEntryMap` if not in it yet.
      viewToEntryMap.set(view, {
        view,
        leaving: false,
      });
    }

    return Array.from(viewToEntryMap.values());
  }

  override render(): ReactNode {
    const {
      match,
      single = SINGLE_OPTION_DEFAULT,
      exact,
      component: Component,
    } = this.props;

    return this.viewEntries.map(({view, leaving}) => {
      if (!(exact === undefined || exact === view.$exact)) {
        return null;
      }

      return (
        <RouteContext.Provider
          key={single ? 'single' : view.$id}
          value={{route: match, view}}
        >
          <Component route={match} view={view} leaving={leaving} />
        </RouteContext.Provider>
      );
    });
  }
}

interface RouteViewEntry {
  view: IView<unknown>;
  leaving: RouteComponentLeaving | false;
}
