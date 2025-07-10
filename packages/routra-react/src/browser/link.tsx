import classNames from 'classnames';
import {observer} from 'mobx-react';
import type {ComponentProps, JSX} from 'react';
import React from 'react';
import type {RouteClass__} from 'routra';

export type LinkProps<TRoute extends RouteClass__> = Omit<
  ComponentProps<'a'>,
  'href'
> & {
  route: TRoute;
  replace?: boolean;
};

export const Link = observer(
  ({
    className,
    route,
    replace,
    ...props
  }: LinkProps<RouteClass__>): JSX.Element => {
    return (
      <a
        className={classNames(className, route.$active && 'active')}
        {...props}
        href={route.$href}
        onClick={event => {
          if (replace) {
            route.$replace();
          } else {
            route.$push();
          }

          event.preventDefault();
        }}
      />
    );
  },
);
