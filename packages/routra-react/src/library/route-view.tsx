import type {
  AnimationEvent,
  AnimationEventHandler,
  ComponentType,
  ReactElement,
  TransitionEvent,
  TransitionEventHandler,
} from 'react';
import React, {createContext, useMemo, useState} from 'react';
import {useEvent} from 'react-use-event-hook';
import type {RouteNodeClass__, ViewEntry, ViewEntry__} from 'routra';

import type {RouteComponentProps} from './route.js';

export const RouteContext = createContext<RouteContextObject>(undefined!);

export type RouteViewProps<TRoute extends RouteNodeClass__> = {
  entry: ViewEntry<TRoute>;
  component: ComponentType<RouteComponentProps<TRoute>>;
};

export const RouteView = <TRoute extends RouteNodeClass__>({
  entry,
  component: Component,
}: RouteViewProps<TRoute>): ReactElement => {
  const onAnimationOrTransitionEnd = useEvent(
    ({target, currentTarget}: AnimationEvent | TransitionEvent) => {
      if (
        target !== currentTarget &&
        !(target as HTMLElement).classList.contains('routra-transition')
      ) {
        return;
      }

      const {$entering, $leaving} = entry;

      if ($entering) {
        $entering.$complete();
      } else if ($leaving) {
        $leaving.$complete();
      }
    },
  );

  const [transition] = useState(() => {
    return {
      events: {
        onAnimationEnd: onAnimationOrTransitionEnd,
        onTransitionEnd: onAnimationOrTransitionEnd,
      },
    };
  });

  const context = useMemo(() => {
    return {
      view: entry,
      transition,
    };
  }, [entry, transition]);

  return (
    <RouteContext.Provider value={context}>
      <Component view={entry} transition={transition} />
    </RouteContext.Provider>
  );
};

export type RouteContextObject = {
  view: ViewEntry__;
  transition: RouteViewComponentTransition;
};

export type RouteViewComponentTransition = {
  events: {
    onAnimationEnd: AnimationEventHandler;
    onTransitionEnd: TransitionEventHandler;
  };
};
