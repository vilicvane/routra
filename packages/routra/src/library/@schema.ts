export type SchemaStateInput_<TSchema> = TSchema extends SchemaStatePart<
  infer TState
>
  ? TState extends () => unknown
    ? void
    : TState extends (
        input: infer TStateInput,
        upperMergedState: infer _TUpperMergedState,
      ) => unknown
    ? TStateInput
    : TState
  : object;

export type SchemaState_<TSchema> = TSchema extends SchemaStatePart<
  infer TState
>
  ? TState extends (
      input: infer _TStateInput,
      upperMergedState: infer _TUpperMergedState,
    ) => infer TState
    ? TState
    : TState
  : object;

interface SchemaStatePart<TState extends object> {
  $state: TState;
}

export type ChildSchemaFallback_<TSchema> = TSchema extends object
  ? TSchema
  : {};
