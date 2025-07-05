import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {useContext} from 'react';
import type {IView, RouteNodeClass__, ViewEntry} from 'routra';

import type {RouteViewComponentTransition} from './route-view.js';
import {RouteContext, RouteView} from './route-view.js';

export type RouteComponentProps<TRoute extends RouteNodeClass__> = {
  view: ViewEntry<TRoute>;
  transition: RouteViewComponentTransition;
};

export type RouteProps<TRoute extends RouteNodeClass__> = {
  view: IView<TRoute>;
} & (
  | {component: ComponentType<RouteComponentProps<TRoute>>}
  | {children: ReactNode}
);

export const Route = observer(
  <TRoute extends RouteNodeClass__>({view, ...props}: RouteProps<TRoute>) => {
    const context = useContext(RouteContext);

    if (context) {
      throw new Error('Using <Route> inside <Route> is not allowed.');
    }

    return view.$entries.map(entry => (
      <RouteView key={entry.$key} entry={entry} {...props} />
    ));
  },
);
