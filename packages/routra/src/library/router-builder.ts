import type {RouterType_, Router__} from './router';
import {Router_} from './router';
import type {SchemaRecord, SchemaRecord__} from './schema';
import type {
  RootViewDefinitionRecord_,
  RootViewDefinitionRecord__,
} from './view';

export type RouterBuilder<
  TSchemaRecord extends SchemaRecord,
  TRootViewDefinitionRecord extends RootViewDefinitionRecord_<TSchemaRecord>,
  TProvidedOptionKey extends string = never,
> = Omit<
  {
    $views<
      TRootViewDefinitionRecord extends RootViewDefinitionRecord_<TSchemaRecord>,
    >(
      views: TRootViewDefinitionRecord,
    ): RouterBuilder<
      TSchemaRecord,
      TRootViewDefinitionRecord,
      TProvidedOptionKey | '$views'
    >;

    $create(): RouterType_<TSchemaRecord, TRootViewDefinitionRecord>;
  },
  TProvidedOptionKey
>;

export class RouterBuilderObject__ {
  constructor(
    private schemas: SchemaRecord__,
    private views?: RootViewDefinitionRecord__,
  ) {}

  $views(views: RootViewDefinitionRecord__): RouterBuilderObject__ {
    return new RouterBuilderObject__(this.schemas, views);
  }

  $create(): Router__ {
    return new Router_(this.schemas, this.views);
  }
}

export function routra<TSchemaRecord extends SchemaRecord>(
  schema: TSchemaRecord,
): RouterBuilder<TSchemaRecord, RootViewDefinitionRecord_<TSchemaRecord>>;
export function routra(schema: SchemaRecord__): unknown {
  return new RouterBuilderObject__(schema);
}
