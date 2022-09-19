import type {_MergeState} from './route';
import type {StateType} from './schema';

export type __ViewDefinitionRecord = {
  [TKey in string]: __ViewDefinition;
};

export type __RootViewDefinitionRecord = {
  $transition?: unknown;
} & __ViewDefinitionRecord;

export type __ViewDefinition = {
  $view?: __ViewBuilder;
} & __ViewDefinitionRecord;

export type _ViewBuilder<TMergedState, TView> =
  | (new (state: TMergedState) => TView)
  | ((state: TMergedState) => TView);

export type __ViewBuilder = _ViewBuilder<object, object>;

export type _RootViewDefinitionRecord<TSchemaRecord> = {
  $transition?: unknown;
} & {
  [TKey in keyof TSchemaRecord]?: _ChildViewDefinitionRecord<
    TSchemaRecord[TKey] extends infer TSchema extends object ? TSchema : {},
    {}
  >;
};

type _ChildViewDefinitionRecord<TSchema, TUpperMergedState> = _MergeState<
  TUpperMergedState,
  StateType<TSchema>
> extends infer TMergedState
  ? {
      [TKey in Exclude<
        Extract<keyof TSchema, string>,
        `$${string}`
      >]?: _ChildViewDefinitionRecord<
        TSchema[TKey] extends infer TChildSchema extends object
          ? TChildSchema
          : {},
        TMergedState
      >;
    } & {
      $view?: _ViewBuilder<TMergedState, object>;
    }
  : never;

export interface IView<TTransitionState> {
  $id: number;
  $exact: boolean;
  $transition: TTransitionState | undefined;
}
