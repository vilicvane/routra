import {computed, makeObservable, observable, runInAction} from 'mobx';
import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component, createContext} from 'react';
import type {IView__, RouteNode__, RouteView} from 'routra';
import {createMergedObjectProxy} from 'routra';

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

  private single:
    | {
        view: IView__;
        mergedView: IView__;
      }
    | undefined;

  constructor(props: RouteProps<TRoute>) {
    super(props);

    makeObservable(this);
  }

  @computed
  private get viewEntries(): RouteViewEntry[] {
    const {
      match,
      exact,
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

    if (typeof exact === 'boolean') {
      matchedViewAndRouteTuples = matchedViewAndRouteTuples.filter(
        ([view]) => view.$exact === exact,
      );
    }

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

      // Otherwise this view is no longer active.

      if (leavingEnabled) {
        if (single && matchedViewAndRouteTuples.length > 0) {
          viewToEntryMap.delete(view);
        } else {
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
        }
      } else {
        viewToEntryMap.delete(view);
      }
    }

    for (const [view, route] of pendingIteratingMatchedViewToRouteMap) {
      // Add view to `viewToEntryMap` if not in it yet.
      viewToEntryMap.set(view, {
        key: view.$id,
        view,
        route,
        leaving: false,
      });
    }

    const entries = Array.from(viewToEntryMap.values());

    if (single) {
      if (entries.length === 0) {
        if (this.single) {
          this.single = undefined;
        }

        return [];
      }

      const [{key: _key, view, ...rest}] = entries;

      const recordedSingle = this.single;

      if (!recordedSingle) {
        if (view.$transition === undefined) {
          this.single = {
            view,
            mergedView: view,
          };
        }

        return [
          {
            key: 'single',
            view,
            ...rest,
          },
        ];
      }

      if (view.$transition !== undefined) {
        this.single = undefined;

        return [
          {
            key: 'single',
            view,
            ...rest,
          },
        ];
      }

      const {view: recordedView, mergedView: recordedMergedView} =
        recordedSingle;

      if (view === recordedView) {
        return [
          {
            key: 'single',
            view: recordedMergedView,
            ...rest,
          },
        ];
      }

      const {$transition, $afterTransition} = recordedMergedView;

      const mergedView = createMergedObjectProxy([
        {
          get $transition() {
            return $transition;
          },
          get $afterTransition() {
            return $afterTransition;
          },
        },
        view,
      ]) as IView__;

      this.single = {
        view,
        mergedView,
      };

      return [
        {
          key: 'single',
          view: mergedView,
          ...rest,
        },
      ];
    } else {
      return entries;
    }
  }

  override render(): ReactNode {
    const {component: Component} = this.props;

    return this.viewEntries.map(({key, view, route, leaving}) => {
      return (
        <RouteContext.Provider key={key} value={{route, view}}>
          <Component route={route as TRoute} view={view} leaving={leaving} />
        </RouteContext.Provider>
      );
    });
  }
}

interface RouteViewEntry {
  key: number | string;
  view: IView__;
  route: RouteNode__;
  leaving: RouteComponentLeaving | false;
}
