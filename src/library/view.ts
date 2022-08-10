import type {StateType} from './schema';

export type __ViewDefinitionRecord = {
  [TKey in string]: __ViewDefinition;
};

export type __ViewDefinition = {
  $view?: __ViewBuilder;
} & __ViewDefinitionRecord;

export type ViewBuilder<TMergedState, TView> = (state: TMergedState) => TView;

export type __ViewBuilder = ViewBuilder<object, object>;

export type __RootViewDefinitionRecord<TSchemaRecord> = {
  [TKey in keyof TSchemaRecord]?: __ChildViewDefinitionRecord<
    TSchemaRecord[TKey] extends infer TSchema extends object ? TSchema : {},
    {}
  >;
};

type __ChildViewDefinitionRecord<TSchema, TUpperMergedState> =
  TUpperMergedState & StateType<TSchema> extends infer TMergedState
    ? {
        [TKey in Exclude<
          Extract<keyof TSchema, string>,
          `$${string}`
        >]?: __ChildViewDefinitionRecord<
          TSchema[TKey] extends infer TChildSchema extends object
            ? TChildSchema
            : {},
          TMergedState
        >;
      } & {
        $view?: ViewBuilder<TMergedState, object>;
      }
    : never;
