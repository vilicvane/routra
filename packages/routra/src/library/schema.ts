export interface Schema {
  $state?: object | (() => object);
  $exact?: boolean;
  $children?: SchemaRecord;
}

export type SchemaRecord = Record<string, Schema | true>;
