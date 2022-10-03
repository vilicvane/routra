import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component} from 'react';
import type {RouteNode__} from 'routra';

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
  override render(): ReactNode {
    const {match, exact, component: Component} = this.props;

    const views = match.$views;

    if (views.length === 0) {
      return null;
    }

    if (exact !== undefined && views.every(view => view.$exact !== exact)) {
      return null;
    }

    return <Component route={match} />;
  }
}
