import {observer} from 'mobx-react';
import type {ComponentType} from 'react';
import React from 'react';
import type {RouteNodeClass__} from 'routra';

export interface MatchComponentProps<TRoute extends RouteNodeClass__> {
  route: TRoute;
}

export interface MatchProps<TRoute extends RouteNodeClass__> {
  match: TRoute;
  component: ComponentType<MatchComponentProps<TRoute>>;
}

export const Match = observer(
  <TRoute extends RouteNodeClass__>({
    match,
    component: Component,
  }: MatchProps<TRoute>) => {
    return match.$matched ? <Component route={match} /> : null;
  },
);
