import {computed, makeObservable, observable, runInAction} from 'mobx';
import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component, createContext} from 'react';
import type {IView__, RouteNode__, RouteView} from 'routra';
import {createMergedObjectProxy} from 'routra';

import type {MatchContextObject} from './@match-context';
import {MatchContext} from './@match-context';
import {routraReactOptions} from './options';

const STABLE_OPTION_DEFAULT = false;
const SINGLE_OPTION_DEFAULT = false;
const LEAVING_OPTION_DEFAULT = false;

export const RouteContext = createContext<RouteViewEntry>(undefined!);

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
  leaving?: boolean | number;
  component: ComponentType<RouteComponentProps<TRoute>>;
}

@observer
export class Route<TRoute extends RouteNode__> extends Component<
  RouteProps<TRoute>
> {
  declare context: MatchContextObject | undefined;

  private _viewToEntryMap = new Map<RouteView<TRoute>, RouteViewEntry>();

  @observable
  private tick = 0;

  private single:
    | {
        view: IView__;
        mergedView: IView__;
      }
    | undefined;

  private emptyContent = false;

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
      leaving = LEAVING_OPTION_DEFAULT,
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

      if (
        leaving === false ||
        (single && matchedViewAndRouteTuples.length > 0) ||
        view.$transition !== undefined
      ) {
        viewToEntryMap.delete(view);
        continue;
      }

      let leavingTimeoutId: number | undefined;

      const complete = (): void => {
        clearTimeout(leavingTimeoutId);

        if (viewToEntryMap.delete(view)) {
          runInAction(() => {
            this.tick++;
          });
        }
      };

      viewToEntryMap.set(view, {
        ...entry,
        leaving: {
          $complete: complete,
        },
      });

      leavingTimeoutId = setTimeout(
        complete,
        typeof leaving === 'number'
          ? leaving
          : routraReactOptions.defaultLeavingTimeout,
      );
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

    const content = this.viewEntries.map(entry => {
      const {key, view, route, leaving} = entry;

      return (
        <RouteContext.Provider key={key} value={entry}>
          <Component route={route as TRoute} view={view} leaving={leaving} />
        </RouteContext.Provider>
      );
    });

    this.emptyContent = content.length === 0;

    return content;
  }

  override componentDidMount(): void {
    this.componentDidUpdate();
  }

  override componentDidUpdate(): void {
    const {context} = this;

    if (this.emptyContent) {
      context?.unmount(this);
    } else {
      context?.mount(this);
    }
  }

  override componentWillUnmount(): void {
    const {context} = this;

    context?.unmount(this);
  }

  static override contextType = MatchContext;
}

interface RouteViewEntry {
  key: number | string;
  view: IView__;
  route: RouteNode__;
  leaving: RouteComponentLeaving | false;
}
