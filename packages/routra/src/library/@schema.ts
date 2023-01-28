export type StateType<TSchema> = TSchema extends SchemaStatePart<infer TState>
  ? TState
  : object;

interface SchemaStatePart<TState extends object> {
  $state: TState;
}
