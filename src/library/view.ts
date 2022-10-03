import type {IComputedValue} from 'mobx';

import type {StateType} from './schema';

export interface ViewEntry {
  id: number;
  path: string[];
  stateMap: Map<string, object>;
  viewComputedValues: IComputedValue<object>[];
  previous?: ViewEntry;
  transition: boolean;
}

export type ViewDefinitionRecord__ = {
  [TKey in string]: ViewDefinition__;
};

export type RootViewDefinitionRecord__ = {
  $transition?: unknown;
} & ViewDefinitionRecord__;

export type ViewDefinition__ = {
  $view?: ViewBuilder__;
} & ViewDefinitionRecord__;

export type ViewBuilder_<TMergedState, TView> =
  | (new (state: TMergedState) => TView)
  | ((state: TMergedState) => TView);

export type ViewBuilder__ = ViewBuilder_<object, object>;

export type RootViewDefinitionRecord_<TSchemaRecord> = {
  $transition?: unknown;
} & {
  [TKey in keyof TSchemaRecord]?: ChildViewDefinitionRecord_<
    TSchemaRecord[TKey] extends infer TSchema extends object ? TSchema : {},
    {}
  >;
};

type ChildViewDefinitionRecord_<TSchema, TUpperMergedState> = MergeState_<
  TUpperMergedState,
  StateType<TSchema>
> extends infer TMergedState
  ? {
      [TKey in Exclude<
        Extract<keyof TSchema, string>,
        `$${string}`
      >]?: ChildViewDefinitionRecord_<
        TSchema[TKey] extends infer TChildSchema extends object
          ? TChildSchema
          : {},
        TMergedState
      >;
    } & {
      $view?: ViewBuilder_<TMergedState, object>;
    }
  : never;

export type MergeState_<TUpperState, TState> = Omit<TUpperState, keyof TState> &
  TState;

export interface IView<TTransitionState> {
  $id: number;
  $exact: boolean;
  $transition: TTransitionState | undefined;
}
