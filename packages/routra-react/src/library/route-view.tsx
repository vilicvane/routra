import type {
  AnimationEvent,
  AnimationEventHandler,
  ComponentType,
  ReactElement,
} from 'react';
import React, {createContext, useMemo, useState} from 'react';
import useEvent from 'react-use-event-hook';
import type {RouteNode__, ViewEntry, ViewEntry__} from 'routra';

import type {RouteComponentProps} from './route';

export const RouteContext = createContext<RouteContextObject>(undefined!);

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
      $entering.$complete();
    } else if ($leaving) {
      $leaving.$complete();
    }
  });

  const [transition] = useState(() => {
    return {
      events: {
        onAnimationEnd,
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

export interface RouteContextObject {
  view: ViewEntry__;
  transition: RouteViewComponentTransition;
}

export interface RouteViewComponentTransition {
  events: {
    onAnimationEnd: AnimationEventHandler;
  };
}
