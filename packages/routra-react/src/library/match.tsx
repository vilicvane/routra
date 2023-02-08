import {observer} from 'mobx-react';
import type {ComponentType} from 'react';
import React from 'react';
import type {RouteNode__} from 'routra';

export interface MatchComponentProps<TRoute extends RouteNode__> {
  route: TRoute;
}

export interface MatchProps<TRoute extends RouteNode__> {
  match: TRoute;
  component: ComponentType<MatchComponentProps<TRoute>>;
}

export const Match = observer(
  <TRoute extends RouteNode__>({
    match,
    component: Component,
  }: MatchProps<TRoute>) => {
    return match.$matched ? <Component route={match} /> : null;
  },
);
