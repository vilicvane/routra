import type {SchemaRecord} from './schema';

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

export type SchemaChildrenType_<TSchema> = TSchema extends SchemaChildrenPart<
  infer TChildren
>
  ? TChildren
  : object;

interface SchemaChildrenPart<TChildren extends SchemaRecord> {
  $children: TChildren;
}

export type ChildSchemaFallback_<TSchema> = TSchema extends object
  ? TSchema
  : {};
