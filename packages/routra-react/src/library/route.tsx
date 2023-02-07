import {makeObservable} from 'mobx';
import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component} from 'react';
import type {IView, RouteNode__, ViewEntry} from 'routra';

import type {MatchContextObject} from './@match-context';
import {MatchContext} from './@match-context';
import type {RouteViewComponentTransition} from './@route-view';
import {RouteView} from './@route-view';

export interface RouteComponentLeaving {
  $complete(): void;
}

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
  declare context: MatchContextObject | undefined;

  private emptyContent = false;

  constructor(props: RouteProps<TRoute>) {
    super(props);

    makeObservable(this);
  }

  override render(): ReactNode {
    const {view, component} = this.props;

    const content = view.$entries.map(entry => (
      <RouteView key={entry.$key} entry={entry} component={component} />
    ));

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
