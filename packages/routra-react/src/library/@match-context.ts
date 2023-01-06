import {computed, makeObservable, observable, runInAction} from 'mobx';
import type {Component} from 'react';
import {createContext} from 'react';

export class MatchContextObject {
  @observable
  private mountedComponentSet = new Set<Component>();

  constructor() {
    makeObservable(this);
  }

  @computed
  get empty(): boolean {
    return this.mountedComponentSet.size === 0;
  }

  mount(component: Component): void {
    runInAction(() => {
      this.mountedComponentSet.add(component);
    });
  }

  unmount(component: Component): void {
    runInAction(() => {
      this.mountedComponentSet.delete(component);
    });
  }
}

export const MatchContext = createContext<MatchContextObject | undefined>(
  undefined,
);
