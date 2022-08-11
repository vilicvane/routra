import _ from 'lodash';
import type {IComputedValue} from 'mobx';
import {computed, makeObservable, observable, runInAction} from 'mobx';

import {createMergedObjectProxy, getCommonStartOfTwoArray} from './@utils';
import type {_RouteType} from './route';
import {_createRoute} from './route';
import type {SchemaRecord, __SchemaRecord} from './schema';
import type {_RootViewDefinitionRecord, __ViewDefinitionRecord} from './view';

export class _RouterClass<TSchemaRecord, TViewDefinitionRecord> {
  readonly $stack: RouterStackEntry[] = observable.array([], {
    deep: false,
  });

  constructor(schemas: TSchemaRecord, views?: TViewDefinitionRecord);
  constructor(
    private _schemas: __SchemaRecord,
    private _views: __ViewDefinitionRecord = {},
  ) {
    makeObservable(this);

    for (let [key, schema] of Object.entries(_schemas)) {
      if (schema === true) {
        schema = {};
      }

      (this as any)[key] = _createRoute(this as any, schema, [key], new Map());
    }
  }

  @computed
  get $path(): object {
    this._assertNonEmptyStack();

    return _.last(this.$stack)!.path;
  }

  @computed
  get $view(): object {
    this._assertNonEmptyStack();

    let {path, viewComputedValueMap} = _.last(this.$stack)!;

    let key = _.last(path)!;

    return viewComputedValueMap.get(key)!.get()!;
  }

  @computed
  get _activeEntry(): RouterStackEntry {
    this._assertNonEmptyStack();

    return _.last(this.$stack)!;
  }

  _reset(path: string[], statePartMap: Map<string, object>): void {
    let stack = this.$stack;

    let stateMap = this._buildStateMap(path, statePartMap, _.last(stack));
    let entry = this._buildEntry(path, stateMap);

    runInAction(() => {
      stack.splice(0, Infinity, entry);
    });
  }

  _push(path: string[], statePartMap: Map<string, object>): void {
    this._assertNonEmptyStack();

    let stack = this.$stack;

    let stateMap = this._buildStateMap(path, statePartMap, _.last(stack)!);
    let entry = this._buildEntry(path, stateMap);

    runInAction(() => {
      stack.push(entry);
    });
  }

  _replace(path: string[], statePartMap: Map<string, object>): void {
    let stack = this.$stack;

    let stateMap = this._buildStateMap(path, statePartMap, _.last(stack)!);
    let entry = this._buildEntry(path, stateMap);

    runInAction(() => {
      stack[stack.length - 1] = entry;
    });
  }

  _pop(path: string[]): void {
    this._assertNonEmptyStack();

    let stack = this.$stack;

    if (!_.isEqual(path, _.last(stack)!.path)) {
      return;
    }

    runInAction(() => {
      stack.pop();
    });
  }

  private _buildEntry(
    path: string[],
    observableStateMap: Map<string, object>,
  ): RouterStackEntry {
    let lastKey = _.last(path)!;

    let viewComputedValueMap = new Map<string, IComputedValue<object>>();

    let observableStates: object[] = [];

    let upperViews = this._views;

    for (let key of path) {
      observableStates.unshift(observableStateMap.get(key)!);

      let orderedObservableStatesToKey = [
        {
          $exact: key === lastKey,
        },
        ...observableStates,
      ];

      let mergedObservableState = createMergedObjectProxy(
        orderedObservableStatesToKey,
      );

      let views = upperViews[key] ?? {};

      let viewBuilder = views.$view;

      let mergedViewComputedValue = computed(() => {
        if (!viewBuilder) {
          return mergedObservableState;
        }

        let view = viewBuilder(mergedObservableState);

        return createMergedObjectProxy([view, ...orderedObservableStatesToKey]);
      });

      viewComputedValueMap.set(key, mergedViewComputedValue);

      upperViews = views;
    }

    return {
      path,
      stateMap: observableStateMap,
      viewComputedValueMap,
    };
  }

  private _buildStateMap(
    path: string[],
    statePartMap: Map<string, object>,
    activeEntry: RouterStackEntry | undefined,
  ): Map<string, object> {
    let {path: activePath, stateMap: activeStateMap} = activeEntry ?? {
      path: [],
      stateMap: new Map(),
    };

    let stateMap = new Map<string, object>();

    let commonStartKeys = getCommonStartOfTwoArray(path, activePath);

    let upperSchemas = this._schemas;

    for (let key of commonStartKeys) {
      let state = {
        ...activeStateMap.get(key)!,
        ...statePartMap.get(key),
      };

      stateMap.set(key, observable(state));

      let schemas = upperSchemas[key];

      upperSchemas = typeof schemas === 'object' ? schemas : {};
    }

    for (let key of path.slice(commonStartKeys.length)) {
      let schemas = upperSchemas[key];

      if (schemas === true) {
        schemas = {};
      }

      let state = {
        ...schemas.$state,
        ...statePartMap.get(key),
      };

      stateMap.set(key, observable(state));

      upperSchemas = schemas;
    }

    return stateMap;
  }

  private _assertNonEmptyStack(): void {
    if (this.$stack.length === 0) {
      throw new Error('Router has not been initialized, push or reset first');
    }
  }
}

export interface RouterStackEntry {
  path: string[];
  stateMap: Map<string, object>;
  viewComputedValueMap: Map<string, IComputedValue<object>>;
}

export type RouterConstructor = new <
  TSchemaRecord extends SchemaRecord,
  TViewDefinitionRecord extends _RootViewDefinitionRecord<TSchemaRecord>,
>(
  schemas: TSchemaRecord,
  views?: TViewDefinitionRecord,
) => _RouterType<TSchemaRecord, TViewDefinitionRecord>;

export const Router = _RouterClass as RouterConstructor;

export type Router<
  TSchemaRecord extends __SchemaRecord,
  TViewDefinitionRecord extends _RootViewDefinitionRecord<TSchemaRecord>,
> = _RouterType<TSchemaRecord, TViewDefinitionRecord>;

export type __Router = _RouterClass<__SchemaRecord, object>;

type _RouterType<TSchemaRecord, TViewDefinitionRecord> = Exclude<
  Exclude<keyof TViewDefinitionRecord, '$view'>,
  keyof TSchemaRecord
> extends infer TExtraViewKey extends string
  ? [TExtraViewKey] extends [never]
    ? _RouterClass<TSchemaRecord, TViewDefinitionRecord> & {
        [TKey in Extract<keyof TSchemaRecord, string>]: _RouteType<
          TSchemaRecord[TKey] extends infer TSchema extends object
            ? TSchema
            : {},
          TViewDefinitionRecord extends Record<TKey, object>
            ? TViewDefinitionRecord[TKey]
            : {},
          {},
          [TKey]
        >;
      }
    : {TypeError: `Unexpected view key "${TExtraViewKey}"`}
  : never;
