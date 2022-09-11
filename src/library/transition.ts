import type {IObservableValue} from 'mobx';
import {runInAction} from 'mobx';

import type {__ViewEntry} from './@state';
import {updateStateMapByPart} from './@state';
import type {RouteOperationSetter} from './route-operation';

export function _createTransition(
  targetEntry: __ViewEntry,
  transitionEntry: __ViewEntry,
  newStatePart: object,
  observableTransitionState: IObservableValue<unknown>,
  setter: RouteOperationSetter,
  abortHandler: TransitionAbortHandler,
): _Transition<unknown> {
  return Object.setPrototypeOf((transitionState: object) => {
    runInAction(() => {
      observableTransitionState.set(transitionState);
    });
  }, new _TransitionObject(targetEntry, transitionEntry, newStatePart, setter, abortHandler));
}

export interface _Transition<TTransitionState> extends _TransitionObject {
  (state: TTransitionState): void;
}

export type TransitionAbortHandler = () => void;

export class _TransitionObject {
  constructor(
    private targetEntry: __ViewEntry,
    private transitionEntry: __ViewEntry,
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
