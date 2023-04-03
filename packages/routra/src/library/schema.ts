type Alphabet =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';

export type RouteKey = `${Alphabet | Uppercase<Alphabet>}${string}`;

export type SchemaRecord = {
  [TKey in RouteKey]: Schema | true;
};

export type Schema = {
  $state?:
    | object
    | ((input: object | undefined, upperMergedState: object) => object);
  $exact?: boolean;
} & SchemaRecord;

export type SchemaRecord__ = {
  [TKey in string]: Schema__ | true;
};

export type Schema__ = {
  $state?: object | (() => object);
  $exact?: boolean;
} & SchemaRecord__;
