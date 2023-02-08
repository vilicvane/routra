import {observer} from 'mobx-react';
import type {ComponentType} from 'react';
import React from 'react';
import type {IView, RouteNode__, ViewEntry} from 'routra';

import type {RouteViewComponentTransition} from './route-view';
import {RouteView} from './route-view';

export interface RouteComponentProps<TRoute extends RouteNode__> {
  view: ViewEntry<TRoute>;
  transition: RouteViewComponentTransition;
}

export interface RouteProps<TRoute extends RouteNode__> {
  view: IView<TRoute>;
  component: ComponentType<RouteComponentProps<TRoute>>;
}

export const Route = observer(
  <TRoute extends RouteNode__>({view, component}: RouteProps<TRoute>) => {
    return (
      <>
        {view.$entries.map(entry => (
          <RouteView key={entry.$key} entry={entry} component={component} />
        ))}
      </>
    );
  },
);
