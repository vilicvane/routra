import {computed, makeObservable, observable, runInAction} from 'mobx';
import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component, createContext} from 'react';
import type {IView__, RouteNode__, RouteView} from 'routra';

const STABLE_OPTION_DEFAULT = false;
const SINGLE_OPTION_DEFAULT = false;
const LEAVING_OPTION_DEFAULT = false;

export interface RouteContext {
  route: RouteNode__;
  view: IView__;
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
  match: TRoute | TRoute[];
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

    // Reference tick observable.
    void this.tick;

    const viewToEntryMap = this._viewToEntryMap;

    const matches = Array.isArray(match) ? match : [match];

    let matchedViewAndRouteTuples = matches.flatMap(match =>
      match.$views.map((view): [IView__, RouteNode__] => [view, match]),
    );

    if (stable) {
      matchedViewAndRouteTuples = matchedViewAndRouteTuples.filter(
        ([view]) => view.$transition === undefined,
      );
    }

    if (single) {
      if (matchedViewAndRouteTuples.length > 1) {
        matchedViewAndRouteTuples = [
          matchedViewAndRouteTuples.find(
            ([view]) => view.$transition === undefined,
          ) ?? matchedViewAndRouteTuples[0],
        ];
      }
    }

    const pendingIteratingMatchedViewToRouteMap = new Map(
      matchedViewAndRouteTuples,
    );

    for (const [view, entry] of viewToEntryMap) {
      // The view is active if found in the matched views.
      const active = pendingIteratingMatchedViewToRouteMap.delete(view);

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

    for (const [view, route] of pendingIteratingMatchedViewToRouteMap) {
      // Add view to `viewToEntryMap` if not in it yet.
      viewToEntryMap.set(view, {
        view,
        route,
        leaving: false,
      });
    }

    return Array.from(viewToEntryMap.values());
  }

  override render(): ReactNode {
    const {
      single = SINGLE_OPTION_DEFAULT,
      exact,
      component: Component,
    } = this.props;

    return this.viewEntries.map(({view, route, leaving}) => {
      if (!(exact === undefined || exact === view.$exact)) {
        return null;
      }

      return (
        <RouteContext.Provider
          key={single ? 'single' : view.$id}
          value={{route, view}}
        >
          <Component route={route as TRoute} view={view} leaving={leaving} />
        </RouteContext.Provider>
      );
    });
  }
}

interface RouteViewEntry {
  view: IView__;
  route: RouteNode__;
  leaving: RouteComponentLeaving | false;
}
