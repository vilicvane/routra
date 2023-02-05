import type {
  AnimationEvent,
  AnimationEventHandler,
  ComponentType,
  FunctionComponent,
} from 'react';
import React, {Fragment, useEffect, useState} from 'react';
import useEvent from 'react-use-event-hook';
import type {IViewEntry} from 'routra';

import {RouteContext} from './route';

export interface RouteViewProps {
  entry: IViewEntry;
  component: ComponentType<RouteViewComponentProps>;
}

export const RouteView: FunctionComponent<RouteViewProps> = ({
  entry,
  component: Component,
}) => {
  const [transition] = useState(() => entry.$transition());

  useEffect(() => () => transition.unregister(), [transition]);

  const onAnimationEnd = useEvent(({target, currentTarget}: AnimationEvent) => {
    if (
      target !== currentTarget &&
      !(target as HTMLElement).classList.contains('routra-transition')
    ) {
      return;
    }

    if (transition.entering) {
      transition.entering.complete();
    } else if (transition.leaving) {
      transition.leaving.complete();
    }
  });

  const [extendedTransition] = useState(() => {
    return Object.create(transition as RouteViewComponentTransition, {
      events: {
        value: {
          onAnimationEnd,
        },
        writable: false,
      },
    });
  });

  return <Component view={entry} transition={extendedTransition} />;
};

export interface RouteViewComponentProps {
  view: ViewEntry;
  transition: RouteViewComponentTransition;
}

export interface RouteViewComponentTransition {
  events: {
    onAnimationEnd: AnimationEventHandler;
  };
}
