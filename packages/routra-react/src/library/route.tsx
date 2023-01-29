import {computed, makeObservable, observable, runInAction} from 'mobx';
import {observer} from 'mobx-react';
import type {ComponentType, ReactNode} from 'react';
import React, {Component, createContext} from 'react';
import type {IView__, RouteNode__, RouteView, View} from 'routra';
import {createMergedObjectProxy} from 'routra';

import type {MatchContextObject} from './@match-context';
import {MatchContext} from './@match-context';
import {routraReactOptions} from './options';

const STABLE_OPTION_DEFAULT = false;
const SINGLE_OPTION_DEFAULT = false;
const LEAVING_OPTION_DEFAULT = false;

export const RouteContext = createContext<RouteViewEntry>(undefined!);

export interface RouteComponentLeaving {
  $complete(): void;
}

export interface RouteComponentProps<TRoute extends RouteNode__> {
  view: NonNullable<RouteView<TRoute>>;
  leaving: RouteComponentLeaving | false;
}

export interface RouteProps<TRoute extends RouteNode__> {
  view: View;
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
    const {view, component: Component} = this.props;

    const content = view.$entries.map(entry => {
      return (
        <RouteContext.Provider key={entry.$id} value={entry}>
          <Component view={entry} />
        </RouteContext.Provider>
      );
    });

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

interface RouteViewEntry {
  key: number | string;
  view: IView__;
  route: RouteNode__;
  leaving: RouteComponentLeaving | false;
}
