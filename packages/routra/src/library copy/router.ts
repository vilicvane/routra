import _ from 'lodash';
import type {IObservableValue} from 'mobx';
import {computed, observable, runInAction} from 'mobx';

import {getCommonStartOfTwoArray} from './@utils';
import type {RouteType_} from './route';
import {createRoute} from './route';
import type {
  RouteBack_,
  RouteOperationSetter,
  RouteOperation_,
} from './route-operation';
import {createRouteBack, createRouteOperation} from './route-operation';
import type {SchemaRecord__} from './schema';
import type {Transition} from './transition';
import {createTransition} from './transition';
import {createMergedObjectProxy} from './utils';
import type {
  ClassViewBuilder__,
  FunctionViewBuilder__,
  RootViewDefinitionRecord__,
  ViewEntry,
} from './view';

export class Router_<
  TSchemaRecord,
  TRootViewDefinitionRecord,
  TTransitionState,
> {
  @observable.ref
  private current: ViewEntry | undefined;

  @observable.ref
  private transition: TransitionEntry | undefined;

  private readonly queue: ViewEntry[] = [];

  constructor(schemas: TSchemaRecord, views?: TRootViewDefinitionRecord);
  constructor(
    private _schemas: SchemaRecord__,
    private _views: RootViewDefinitionRecord__ = {},
  ) {
    for (let [key, schema] of Object.entries(_schemas)) {
      if (schema === true) {
        schema = {};
      }

      (this as any)[key] = createRoute(this as any, schema, [key], new Map());
    }
  }

  get $back(): RouteBack_<TTransitionState> {
    const currentEntry = this._requireCurrentViewEntry();

    const targetEntry = currentEntry.previous;

    if (!targetEntry) {
      throw new Error('No previous entry');
    }

    return createRouteBack(this, targetEntry, () => {
      this._startTransition(targetEntry);
    });
  }

  get $ableToBack(): boolean {
    return this._requireCurrentViewEntry()?.previous !== undefined;
  }

  _reset(
    path: string[],
    newStateMap: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._requireCurrentViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, undefined);

    return createRouteOperation(this, targetEntry, () => {
      this._startTransition(targetEntry);
    });
  }

  _push(
    path: string[],
    newStateMap: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._requireCurrentViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry);

    return createRouteOperation(this, targetEntry, () => {
      this._startTransition(targetEntry);
    });
  }

  _replace(
    path: string[],
    newStateMap: Map<number, object>,
  ): RouteOperation_<unknown, unknown> {
    const activeEntry = this._requireCurrentViewEntry();

    const stateMap = this._buildStateMap(path, newStateMap, activeEntry);
    const targetEntry = this._buildEntry(path, stateMap, activeEntry.previous);

    return createRouteOperation(this, targetEntry, () => {
      this._startTransition(targetEntry);
    });
  }

  _transition(
    targetEntry: ViewEntry,
    newStatePart: object,
    transitionState: unknown,
    setter: RouteOperationSetter,
  ): Transition<unknown> {
    const transitionStateObservable = observable.box(
      transitionState ?? this._views.$transition,
    );

    runInAction(() => {
      this.transition = {
        controlled: true,
        transitionStateObservable,
        entry: targetEntry,
      };
    });

    return createTransition(
      targetEntry,
      newStatePart,
      transitionStateObservable,
      setter,
      () => {
        this.transition = undefined;
      },
    );
  }

  _getActiveEntries(path: string[]): ViewEntry[] {
    const current = this._requireCurrentViewEntry();

    const entering = this.transition;

    const entries = entering ? [current, entering.entry] : [current];

    return entries.filter(
      entry =>
        getCommonStartOfTwoArray(entry.path, path).length === path.length,
    );
  }

  private _startTransition(target: ViewEntry): void {
    if (this.transition) {
      this.queue.push(target);
      return;
    }

    const transition = {
      controlled: false,
      entering: false,
      entry: target,
    } satisfies TransitionEntry;

    this.transition = transition;

    setTimeout(() => {
      if (transition.entering) {
        // Managed by view.
        return;
      }

      this._finishTransition();
    });
  }

  private _finishTransition(): void {
    const entering = this.transition;

    if (!entering) {
      return;
    }

    runInAction(() => {
      this.current = entering.entry;

      this.transition = undefined;

      const next = this.queue.shift();

      if (next) {
        this._startTransition(next);
      }
    });
  }

  private _requireCurrentViewEntry(): ViewEntry {
    const entry = this.current;

    if (!entry) {
      throw new Error('No current active view entry');
    }

    return entry;
  }

  private _buildEntry(
    path: string[],
    observableStateMap: Map<string, object>,
    previous: ViewEntry | undefined,
    transition?:
      | {
          id: number;
          newStatePart: object;
          observableState: IObservableValue<unknown>;
        }
      | undefined,
  ): ViewEntry {
    const id = transition?.id ?? ++Router_.lastViewEntryId;

    const mergedViews: object[] = [];

    const shared = {
      get $id(): number {
        return id;
      },
      get $path(): string[] {
        return path;
      },
    };

    const observableStates: object[] = [];

    let upperViews = this._views;

    const exactIndex = path.length - 1;

    for (const [index, key] of path.entries()) {
      observableStates.unshift(observableStateMap.get(key)!);

      const orderedObservableStatesToKey = [
        shared,
        {
          get $exact(): boolean {
            return index === exactIndex;
          },
          get $entering(): unknown {},
          get $leaving(): unknown {},
        },
        ...(transition ? [transition.newStatePart] : []),
        ...observableStates,
      ];

      const mergedObservableState = createMergedObjectProxy(
        orderedObservableStatesToKey,
      );

      const views = upperViews[key] ?? {};

      const viewBuilderOption = views.$view ?? [];

      const viewBuilders = (
        Array.isArray(viewBuilderOption)
          ? viewBuilderOption
          : [viewBuilderOption]
      )
        .map((viewBuilder): FunctionViewBuilder__ => {
          if (
            // class has prototype writable false
            Object.getOwnPropertyDescriptor(viewBuilder as any, 'prototype')
              ?.writable === false
          ) {
            const ViewConstructor = viewBuilder as ClassViewBuilder__;
            return state => new ViewConstructor(state);
          } else {
            return viewBuilder as FunctionViewBuilder__;
          }
        })
        .reverse();

      const builtViewComputedValues = viewBuilders.map(viewBuilder =>
        computed(() => viewBuilder(mergedObservableState)),
      );

      const mergedViewComputedValue = createMergedObjectProxy(() => {
        if (builtViewComputedValues.length === 0) {
          return [mergedObservableState];
        }

        const views = builtViewComputedValues.map(computedValue =>
          computedValue.get(),
        );

        return [...views, ...orderedObservableStatesToKey];
      });

      mergedViews.push(mergedViewComputedValue);

      upperViews = views;
    }

    const entry: ViewEntry = {
      id,
      path,
      stateMap: observableStateMap,
      mergedViews,
      previous,
      enteringSet: observable.set(),
      leavingSet: observable.set(),
    };

    return entry;
  }

  private _buildStateMap(
    path: string[],
    newStateMap: Map<number, object>,
    activeEntry: ViewEntry | undefined,
  ): Map<string, object> {
    const {path: activePath, stateMap: activeStateMap} = activeEntry ?? {
      path: [],
      stateMap: new Map<string, object>(),
    };

    const stateMap = new Map<string, object>();

    const commonStartKeys = getCommonStartOfTwoArray(path, activePath);

    let upperSchemas = this._schemas;

    for (const [index, key] of commonStartKeys.entries()) {
      const state = newStateMap.get(index);

      stateMap.set(key, state ? observable(state) : activeStateMap.get(key)!);

      const schemas = upperSchemas[key];

      upperSchemas = typeof schemas === 'object' ? schemas : {};
    }

    for (const [index, key] of path.slice(commonStartKeys.length).entries()) {
      let schemas = upperSchemas[key];

      if (schemas === true) {
        schemas = {};
      }

      const state =
        newStateMap.get(commonStartKeys.length + index) ??
        ('$state' in schemas ? schemas.$state : {});

      if (!state) {
        throw new Error(
          `State ${JSON.stringify(
            key,
          )} is missing and no default value is provided`,
        );
      }

      stateMap.set(key, observable(state));

      upperSchemas = schemas;
    }

    return stateMap;
  }

  static lastViewEntryId = 0;
}

export type Router__ = Router_<SchemaRecord__, object, unknown>;

export type RouterType_<TSchemaRecord, TRootViewDefinitionRecord> = Exclude<
  Exclude<keyof TRootViewDefinitionRecord, `$${string}`>,
  keyof TSchemaRecord
> extends infer TExtraViewKey extends string
  ? [TExtraViewKey] extends [never]
    ? TransitionState_<TRootViewDefinitionRecord> extends infer TTransitionState
      ? Router_<TSchemaRecord, TRootViewDefinitionRecord, TTransitionState> & {
          [TKey in Extract<keyof TSchemaRecord, string>]: RouteType_<
            TSchemaRecord[TKey] extends infer TSchema extends object
              ? TSchema
              : {},
            TRootViewDefinitionRecord extends Record<TKey, object>
              ? TRootViewDefinitionRecord[TKey]
              : {},
            {},
            [TKey],
            TTransitionState
          >;
        }
      : never
    : {TypeError: `Unexpected view key "${TExtraViewKey}"`}
  : never;

type TransitionState_<TRootViewDefinitionRecord> =
  TRootViewDefinitionRecord extends {
    $transition: infer TransitionState;
  }
    ? TransitionState
    : undefined;

type TransitionEntry =
  | {
      controlled: true;
      transitionStateObservable: IObservableValue<unknown>;
      entry: ViewEntry;
    }
  | {
      controlled: false;
      /**
       * True indicates entering being managed by view.
       */
      entering: boolean;
      entry: ViewEntry;
    };
