import type {RouteKey, Schema, SchemaRecord} from './schema';

const hasOwnProperty = Object.prototype.hasOwnProperty;

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

export function getChildSchema(schemas: SchemaRecord, key: RouteKey): Schema {
  if (!hasOwnProperty.call(schemas, key)) {
    throw new TypeError(`Schema key ${JSON.stringify(key)} not found`);
  }

  const schema = schemas[key];

  if (schema === true) {
    return {};
  }

  return schema;
}
