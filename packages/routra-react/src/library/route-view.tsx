import type {
  AnimationEvent,
  AnimationEventHandler,
  ComponentType,
  ReactElement,
  ReactNode,
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
} & (
  | {component: ComponentType<RouteComponentProps<TRoute>>}
  | {children: ReactNode}
);

export const RouteView = <TRoute extends RouteNodeClass__>({
  entry,
  ...props
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

  const {
    component: Component,
    children,
  }: {
    component?: ComponentType<RouteComponentProps<TRoute>>;
    children?: ReactNode;
  } = props;

  return (
    <RouteContext.Provider value={context}>
      {Component ? (
        <Component view={entry} transition={transition} />
      ) : (
        children
      )}
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
