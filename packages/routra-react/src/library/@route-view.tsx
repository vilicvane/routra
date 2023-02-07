import type {
  AnimationEvent,
  AnimationEventHandler,
  ComponentType,
  ReactElement,
} from 'react';
import React, {useState} from 'react';
import useEvent from 'react-use-event-hook';
import type {RouteNode__, ViewEntry} from 'routra';

import type {RouteComponentProps} from './route';

export interface RouteViewProps<TRoute extends RouteNode__> {
  entry: ViewEntry<TRoute>;
  component: ComponentType<RouteComponentProps<TRoute>>;
}

export const RouteView = <TRoute extends RouteNode__>({
  entry,
  component: Component,
}: RouteViewProps<TRoute>): ReactElement => {
  const onAnimationEnd = useEvent(({target, currentTarget}: AnimationEvent) => {
    if (
      target !== currentTarget &&
      !(target as HTMLElement).classList.contains('routra-transition')
    ) {
      return;
    }

    const {$entering, $leaving} = entry;

    if ($entering) {
      $entering.complete();
    } else if ($leaving) {
      $leaving.complete();
    }
  });

  const [transition] = useState(() => {
    return {
      events: {
        onAnimationEnd,
      },
    };
  });

  return <Component view={entry} transition={transition} />;
};

export interface RouteViewComponentTransition {
  events: {
    onAnimationEnd: AnimationEventHandler;
  };
}
