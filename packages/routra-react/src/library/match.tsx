import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component} from 'react';
import type {RouteNode__} from 'routra';

import {MatchContext, MatchContextObject} from './@match-context';

export interface MatchComponentProps<TRoute extends RouteNode__> {
  route: TRoute;
}

export interface MatchProps<TRoute extends RouteNode__> {
  match: TRoute;
  exact?: boolean;
  component: ComponentType<MatchComponentProps<TRoute>>;
}

@observer
export class Match<TRoute extends RouteNode__> extends Component<
  MatchProps<TRoute>
> {
  declare context: MatchContextObject | undefined;

  private nestedContext = new MatchContextObject();

  private emptyContent = false;

  override render(): ReactNode {
    const {
      props: {match, exact, component: Component},
      nestedContext,
    } = this;

    const content = (() => {
      if (nestedContext.empty) {
        const views = match.$views;

        if (views.length === 0) {
          return null;
        }

        if (exact !== undefined && views.every(view => view.$exact !== exact)) {
          return null;
        }
      }

      return (
        <MatchContext.Provider value={nestedContext}>
          <Component route={match} />
        </MatchContext.Provider>
      );
    })();

    this.emptyContent = !content;

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
