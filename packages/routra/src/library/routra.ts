import type {Router, RouterOptions, Router__} from './router/index.js';
import {RouterClass} from './router/index.js';
import type {SchemaRecord} from './schema.js';

export function routra<TSchemaRecord extends SchemaRecord>(
  schemas: TSchemaRecord,
): Router<TSchemaRecord, object>;
export function routra<
  TSchemaRecord extends SchemaRecord,
  TSwitchingState extends object,
>(
  schemas: TSchemaRecord,
  options: RouterOptions<TSwitchingState>,
): Router<TSchemaRecord, TSwitchingState>;
export function routra(
  schemas: SchemaRecord,
  options: RouterOptions<object> = {defaultSwitchingState: undefined},
): Router__ {
  return new RouterClass(schemas, options);
}
