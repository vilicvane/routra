import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component} from 'react';
import type {RouteNode__} from 'routra';

export interface MatchComponentProps<TRoute extends RouteNode__> {
  route: TRoute;
}

export interface MatchProps<TRoute extends RouteNode__> {
  match: TRoute;
  component: ComponentType<MatchComponentProps<TRoute>>;
}

@observer
export class Match<TRoute extends RouteNode__> extends Component<
  MatchProps<TRoute>
> {
  override render(): ReactNode {
    const {
      props: {match, component: Component},
    } = this;

    if (match.$matched) {
      return null;
    }

    return <Component route={match} />;
  }
}
