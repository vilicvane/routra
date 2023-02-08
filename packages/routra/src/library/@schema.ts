export type SchemaState_<TSchema> = TSchema extends SchemaStatePart<
  infer TState
>
  ? TState extends () => infer TState
    ? TState
    : TState
  : object;

interface SchemaStatePart<TState extends object> {
  $state: TState;
}

export type ChildSchemaFallback_<TSchema> = TSchema extends object
  ? TSchema
  : {};
