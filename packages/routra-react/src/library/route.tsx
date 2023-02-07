import {makeObservable} from 'mobx';
import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component} from 'react';
import type {IView, RouteNode__, ViewEntry} from 'routra';

import type {RouteViewComponentTransition} from './@route-view';
import {RouteView} from './@route-view';

export interface RouteComponentProps<TRoute extends RouteNode__> {
  view: ViewEntry<TRoute>;
  transition: RouteViewComponentTransition;
}

export interface RouteProps<TRoute extends RouteNode__> {
  view: IView<TRoute>;
  component: ComponentType<RouteComponentProps<TRoute>>;
}

@observer
export class Route<TRoute extends RouteNode__> extends Component<
  RouteProps<TRoute>
> {
  constructor(props: RouteProps<TRoute>) {
    super(props);

    makeObservable(this);
  }

  override render(): ReactNode {
    const {view, component} = this.props;

    return view.$entries.map(entry => (
      <RouteView key={entry.$key} entry={entry} component={component} />
    ));
  }
}
