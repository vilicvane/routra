import {observer} from 'mobx-react';
import type {ComponentType} from 'react';
import React from 'react';
import type {IView, RouteNodeClass__, ViewEntry} from 'routra';

import type {RouteViewComponentTransition} from './route-view.js';
import {RouteView} from './route-view.js';

export type RouteComponentProps<TRoute extends RouteNodeClass__> = {
  view: ViewEntry<TRoute>;
  transition: RouteViewComponentTransition;
};

export type RouteProps<TRoute extends RouteNodeClass__> = {
  view: IView<TRoute>;
  component: ComponentType<RouteComponentProps<TRoute>>;
};

export const Route = observer(
  <TRoute extends RouteNodeClass__>({view, component}: RouteProps<TRoute>) => {
    return (
      <>
        {view.$entries.map(entry => (
          <RouteView key={entry.$key} entry={entry} component={component} />
        ))}
      </>
    );
  },
);
