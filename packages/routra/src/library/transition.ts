import type {IObservableValue} from 'mobx';
import {runInAction} from 'mobx';

import {updateStateMapByPart} from './@state';
import type {RouteOperationSetter} from './route-operation';
import type {ViewEntry} from './view';

export function createTransition(
  targetEntry: ViewEntry,
  transitionEntry: ViewEntry,
  newStatePart: object,
  observableTransitionState: IObservableValue<unknown>,
  setter: RouteOperationSetter,
  abortHandler: TransitionAbortHandler,
): Transition<unknown> {
  return Object.setPrototypeOf((transitionState: object) => {
    runInAction(() => {
      observableTransitionState.set(transitionState);
    });
  }, new TransitionObject(targetEntry, transitionEntry, newStatePart, setter, abortHandler));
}

export interface Transition<TTransitionState> extends TransitionObject {
  (state: TTransitionState): void;
}

export type TransitionAbortHandler = () => void;

export class TransitionObject {
  constructor(
    private targetEntry: ViewEntry,
    private transitionEntry: ViewEntry,
    private newStatePart: object,
    private setter: RouteOperationSetter,
    private abortHandler: TransitionAbortHandler,
  ) {}

  $complete(): void {
    const {path, stateMap} = this.targetEntry;
    const setter = this.setter;

    runInAction(() => {
      updateStateMapByPart(path, stateMap, this.newStatePart);
      setter([this.transitionEntry]);
    });
  }

  $abort(): void {
    const abortHandler = this.abortHandler;

    abortHandler();
  }
}
