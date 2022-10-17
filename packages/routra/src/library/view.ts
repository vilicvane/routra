import type {IComputedValue} from 'mobx';

import type {SchemaRecord__, StateType} from './schema';
import type {OverrideObject_} from './utils';

export interface ViewEntry {
  id: number;
  path: string[];
  stateMap: Map<string, object>;
  viewComputedValues: IComputedValue<object>[];
  previous?: ViewEntry;
  transition: boolean;
}

export interface ViewDefinitionRecord__ {
  [TKey: string]: ViewDefinition__;
}

export type ViewDefinition__ = {
  $view?: ViewBuilder__ | ViewBuilder__[];
} & ViewDefinitionRecord__;

export type FunctionViewBuilder_<TMergedState, TView> = (
  state: TMergedState,
) => TView;

export type FunctionViewBuilder__ = FunctionViewBuilder_<object, object>;

export type ClassViewBuilder_<TMergedState, TView> = new (
  state: TMergedState,
) => TView;

export type ClassViewBuilder__ = ClassViewBuilder_<object, object>;

export type ViewBuilder_<TMergedState, TView> =
  | FunctionViewBuilder_<TMergedState, TView>
  | ClassViewBuilder_<TMergedState, TView>;

export type ViewBuilder__ = ViewBuilder_<object, object>;

export type RootViewDefinitionRecord__ =
  RootViewDefinitionRecord_<SchemaRecord__>;

export type RootViewDefinitionRecord_<TSchemaRecord> = {
  $transition?: unknown;
} & {
  [TKey in keyof TSchemaRecord]?: ChildViewDefinitionRecord_<
    TSchemaRecord[TKey] extends infer TSchema extends object ? TSchema : {},
    {}
  >;
};

type ChildViewDefinitionRecord_<TSchema, TUpperMergedState> = OverrideObject_<
  TUpperMergedState,
  StateType<TSchema>
> extends infer TMergedState
  ? {
      [TKey in Exclude<
        Extract<keyof TSchema, string>,
        `$${string}`
      >]?: ChildViewDefinitionRecord_<
        TSchema[TKey] extends infer TChildSchema extends object
          ? TChildSchema
          : {},
        TMergedState
      >;
    } & {
      $view?:
        | ViewBuilder_<TMergedState, object>
        | [
            ViewBuilder_<TMergedState, object>,
            ...ViewBuilder_<TMergedState, object>[],
          ];
    }
  : never;

export type IView__ = IView<unknown>;

export interface IView<TTransitionState> {
  $id: number;
  $exact: boolean;
  $transition: TTransitionState | undefined;
}
