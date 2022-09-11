import type {IComputedValue, IObservableValue} from 'mobx';

export interface __ViewEntry {
  path: string[];
  stateMap: Map<string, object>;
  viewComputedValueMap: Map<string, IComputedValue<object>>;
  previous?: __ViewEntry;
  transition?: __ViewTransitionData;
}

export interface __ViewTransitionData {
  newStatePart: object;
  observableState: IObservableValue<unknown>;
}
