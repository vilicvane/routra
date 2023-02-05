import type {Route__} from '../route';
import type {RouteEntry} from '../route-entry';

abstract class View {
  constructor(readonly routes: Route__[]) {}

  abstract get $entries(): IViewEntry[];

  protected get matches(): RouteEntry[] {
    return this.routes
      .flatMap(route => [route.$active, route.$transition])
      .filter((match): match is RouteEntry => !!match);
  }
}

export const AbstractView = View;
export type IView = View;

export interface IViewEntry {
  $key: number;
  $transition(): IViewTransition;
  /** @internal */
  _registerTransition(options: ViewEntryRegisterTransitionOptions): void;
}

export interface ViewEntryRegisterTransitionOptions {
  entering: boolean;
  leaving: boolean;
}

let lastViewEntryKey = 0;

export function getNextViewEntryKey(): number {
  return ++lastViewEntryKey;
}

export interface IViewTransition {
  get entering(): ViewTransitionActivity | false;

  get leaving(): ViewTransitionActivity | false;

  register(options: ViewTransitionRegisterOptions): void;
}

export interface ViewTransitionActivity {
  complete(): void;
}

export interface ViewTransitionRegisterOptions {
  entering?: boolean;
  leaving?: boolean;
}
