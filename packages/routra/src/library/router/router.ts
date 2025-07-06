import type {IObservableValue} from 'mobx';
import {observable, runInAction, toJS, when} from 'mobx';
import {MultikeyMap} from 'multikey-map';

import type {ChildSchemaFallback_} from '../@schema.js';
import {getChildSchema} from '../@schema.js';
import {assertState, createMergedState} from '../@state.js';
import {getCommonStartOfTwoArray} from '../@utils.js';
import type {
  RouteClass__,
  RouteNodeClass__,
  RouteNode__,
  RouteOperation__,
  RouteSnapshotSegment,
  RouteSwitching,
  RouteSwitching__,
  RouteTarget,
  RouteType_,
} from '../route/index.js';
import {
  RouteEntry,
  createRoute,
  createRouteOperation,
  createRouteSwitching,
} from '../route/index.js';
import type {RouteKey, Schema, SchemaRecord} from '../schema.js';

import type {RouterBackForward} from './router-back-forward.js';
import {createRouterBackForward} from './router-back-forward.js';

export type Router__ = RouterClass<any>;

export type RouterOptions<TSwitchingState extends object> = {
  defaultSwitchingState?: TSwitchingState;
};

export class RouterClass<TSwitchingState extends object> {
  /** @internal */
  @observable.ref
  accessor _active: ActiveEntry | undefined;

  /** @internal */
  @observable.ref
  accessor _transition: TransitionEntry | undefined;

  /** @internal */
  @observable.ref
  accessor _switching: SwitchingEntry | undefined;

  /** @internal */
  private readonly _queue: [
    operation: RouterOperation,
    targetBuilder: () => RouteTarget,
    complete: () => void,
  ][] = [];

  /** @internal */
  private readonly _stateInputMap = new MultikeyMap<
    [object, Function],
    unknown
  >();

  constructor(
    /** @internal */
    private _schemas: SchemaRecord,
    /** @internal */
    private _options: RouterOptions<TSwitchingState>,
  ) {
    for (let [key, childSchema] of Object.entries(_schemas)) {
      if (key.startsWith('$')) {
        continue;
      }

      if (childSchema === true) {
        childSchema = {};
      }

      (this as any)[key] = createRoute(
        this,
        childSchema as Schema,
        [key],
        new Map(),
      );
    }
  }

  get $path(): string[] | undefined {
    return this._active?.entry.path;
  }

  get $routes():
    | [...(RouteNodeClass__ | RouteClass__)[], RouteClass__]
    | undefined {
    const path = this.$path;

    if (!path) {
      return undefined;
    }

    const routes: any[] = [];

    let current = this as any;

    for (const key of path) {
      current = current[key];

      routes.push(current);
    }

    return routes as [...any[], any];
  }

  get $state(): object | undefined {
    return this._active?.entry.mergedState;
  }

  get $snapshot(): Snapshot | undefined {
    const activeEntry = this._active;

    if (!activeEntry) {
      return undefined;
    }

    const stateInputMap = this._stateInputMap;
    const schemas = this._schemas;

    const {operation, entry} = activeEntry;

    const objects: object[] = [];

    return {
      operation,
      entry: buildEntry('head', entry.getTarget('head')),
      objects: objects.map(object => toJS(object)),
    };

    function buildEntry(
      position: 'head' | 'left' | 'right',
      {path, stateMap, previous, next}: RouteTarget,
    ): SnapshotEntry {
      const states: SnapshotState[] = [];

      let upperSchemas = schemas;

      for (const [index, key] of path.entries()) {
        const schema = getChildSchema(upperSchemas, key as RouteKey);

        const state = stateMap.get(index)!;

        const {$state: schemaState} = schema;

        if (typeof schemaState === 'function') {
          const value = stateInputMap.get([state, schemaState]);

          states.push({value});
        } else {
          const index = objects.indexOf(state);

          if (index >= 0) {
            states.push(index);
          } else {
            states.push(objects.push(state) - 1);
          }
        }

        upperSchemas = schema;
      }

      return {
        path,
        states,
        previous:
          position !== 'right' && previous
            ? buildEntry('left', previous)
            : undefined,
        next:
          position !== 'left' && next ? buildEntry('right', next) : undefined,
      };
    }
  }

  get $back(): RouterBackForward<TSwitchingState> {
    const {
      entry,
      entry: {previous},
    } = this._requireActive();

    if (!previous) {
      throw new Error('No previous entry');
    }

    return createRouterBackForward(this, 'back', {
      ...previous,
      next: entry.getTarget('right'),
    });
  }

  get $ableToBack(): boolean {
    return this._active?.entry.previous !== undefined;
  }

  $backTo(
    route: RouteNode__ | RouteNode__[],
  ): RouterBackForward<TSwitchingState> | undefined {
    const routes = Array.isArray(route) ? route : [route];

    let {
      entry,
      entry: {previous},
    } = this._requireActive();

    let cursor = entry.getTarget('right');

    outer: while (previous) {
      previous = {
        ...previous,
        next: cursor,
      };

      cursor = previous;

      for (const route of routes) {
        if (route._isMatched(previous.path)) {
          break outer;
        }
      }

      previous = previous.previous;
    }

    return previous
      ? createRouterBackForward(this, 'back', previous)
      : undefined;
  }

  get $forward(): RouterBackForward<TSwitchingState> {
    const {
      entry,
      entry: {next},
    } = this._requireActive();

    if (!next) {
      throw new Error('No next entry');
    }

    return createRouterBackForward(this, 'forward', {
      ...next,
      previous: entry.getTarget('left'),
    });
  }

  get $ableToForward(): boolean {
    return this._active?.entry.next !== undefined;
  }

  $forwardTo(
    route: RouteNode__ | RouteNode__[],
  ): RouterBackForward<TSwitchingState> | undefined {
    const routes = Array.isArray(route) ? route : [route];

    let {
      entry,
      entry: {next},
    } = this._requireActive();

    let cursor = entry.getTarget('left');

    outer: while (next) {
      next = {
        ...next,
        previous: cursor,
      };

      cursor = next;

      for (const route of routes) {
        if (route._isMatched(next.path)) {
          break outer;
        }
      }

      next = next.next;
    }

    return next ? createRouterBackForward(this, 'forward', next) : undefined;
  }

  $restore({operation, entry, objects}: Snapshot): void {
    if (this._transition || this._switching) {
      throw new Error('Cannot restore during transition or switching');
    }

    const observableObjects = objects.map(object => observable(object));

    const stateInputMap = this._stateInputMap;

    const schemas = this._schemas;

    const target = restoreTarget('head', entry);

    runInAction(() => {
      this._active = {
        operation,
        entry: new RouteEntry(
          this,
          target.path,
          target.stateMap,
          target.previous,
          target.next,
          undefined,
        ),
      };
    });

    function restoreTarget(
      position: 'head' | 'left' | 'right',
      entry: SnapshotEntry,
    ): RouteTarget {
      const {path, states, previous, next} = entry;

      const stateMap = new Map<number, object>();

      let upperSchemas = schemas;

      for (const [pathIndex, snapshotState] of states.entries()) {
        const key = path[pathIndex] as RouteKey;

        const schema = getChildSchema(upperSchemas, key);
        const {$state: schemaState} = schema;

        if (typeof schemaState === 'function') {
          let input: unknown;

          if (typeof snapshotState === 'number') {
            console.warn('State input missing in snapshot');
            input = undefined;
          } else {
            input = snapshotState.value;
          }

          const state = schemaState(input, createMergedState(stateMap));

          assertState(state, key);

          const observableState = observable(state);

          stateInputMap.set([observableState, schemaState], input);
          stateMap.set(pathIndex, observableState);
        } else {
          if (typeof snapshotState === 'number') {
            const state = observableObjects[snapshotState];

            if (!state) {
              throw new TypeError('State missing in snapshot');
            }

            stateMap.set(pathIndex, state);
          } else {
            const {value = {}} = snapshotState;

            if (typeof value === 'object' && value !== null) {
              stateMap.set(pathIndex, observable(value));
            } else {
              throw new TypeError('State value is not an object in snapshot');
            }
          }
        }

        upperSchemas = schema;
      }

      return {
        path,
        stateMap,
        previous:
          position !== 'right' && previous
            ? restoreTarget('left', previous)
            : undefined,
        next:
          position !== 'left' && next
            ? restoreTarget('right', next)
            : undefined,
        statePart: undefined,
      };
    }
  }

  /** @internal */
  _snapshot_segments(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteSnapshotSegment[] {
    const stateMap = this._buildStateMap(
      path,
      stateMapUpdate,
      this._active?.entry,
    );

    const stateInputMap = this._stateInputMap;

    const segments: RouteSnapshotSegment[] = [];

    let upperSchemas = this._schemas;

    for (const [index, key] of path.entries()) {
      const schema = getChildSchema(upperSchemas, key as RouteKey);

      const state = stateMap.get(index)!;

      const {$state: schemaState} = schema;

      if (typeof schemaState === 'function') {
        const value = stateInputMap.get([state, schemaState]);

        segments.push({name: key, state: value});
      } else {
        segments.push({name: key, state: toJS(state)});
      }

      upperSchemas = schema;
    }

    return segments;
  }

  /** @internal */
  _reset(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation__ {
    return createRouteOperation(this, 'reset', () => {
      const stateMap = this._buildStateMap(
        path,
        stateMapUpdate,
        this._active?.entry,
      );

      return {
        path,
        stateMap,
        previous: undefined,
        next: undefined,
      };
    });
  }

  /** @internal */
  _push(path: string[], stateMapUpdate: Map<number, object>): RouteOperation__ {
    return createRouteOperation(this, 'push', () => {
      const {entry} = this._requireActive();

      const stateMap = this._buildStateMap(path, stateMapUpdate, entry);

      return {
        path,
        stateMap,
        previous: entry.getTarget('left'),
        next: undefined,
      };
    });
  }

  /** @internal */
  _replace(
    path: string[],
    stateMapUpdate: Map<number, object>,
  ): RouteOperation__ {
    return createRouteOperation(this, 'replace', () => {
      const {entry} = this._requireActive();

      const stateMap = this._buildStateMap(path, stateMapUpdate, entry);

      return {
        path,
        stateMap,
        previous: entry.previous,
        next: entry.next,
      };
    });
  }

  /** @internal */
  _switch(
    operation: RouterOperation,
    {path, stateMap, previous, next, statePart}: RouteTarget,
    switchingState: object | undefined,
  ): RouteSwitching__ {
    const ref = {};

    if (switchingState === undefined) {
      switchingState = this._options.defaultSwitchingState;

      if (switchingState === undefined) {
        throw new Error(
          'Switching state is required as no default is provided',
        );
      }
    }

    const switchingStateObservable = observable.box(switchingState);

    const entry = new RouteEntry(
      this,
      path,
      stateMap,
      previous,
      next,
      statePart,
    );

    runInAction(() => {
      this._switching = {
        operation,
        entry,
        switchingStateObservable,
        ref,
      };
    });

    return createRouteSwitching(this, switchingStateObservable, ref);
  }

  /** @internal */
  _completeSwitching(ref: object): void {
    const {operation, entry} = this._requireSwitching(ref);

    runInAction(() => {
      entry._mergePendingStatePart();

      this._active = {
        operation,
        entry,
      };

      this._switching = undefined;
    });
  }

  /** @internal */
  _abortSwitching(ref: object): void {
    this._requireSwitching(ref);

    runInAction(() => {
      this._switching = undefined;
    });
  }

  /** @internal */
  _set(
    operation: RouterOperation,
    targetBuilder: () => RouteTarget,
  ): RouterSetResult {
    return {
      $completed: new Promise(resolve =>
        this._startTransition(operation, targetBuilder, resolve),
      ),
    };
  }

  /** @internal */
  _requireActive(): ActiveEntry {
    const active = this._active;

    if (!active) {
      throw new Error('No active entry');
    }

    return active;
  }

  /** @internal */
  _requireTransition(): TransitionEntry {
    const transition = this._transition;

    if (!transition) {
      throw new Error('No transition entry');
    }

    return transition;
  }

  /** @internal */
  _requireSwitching(ref: object): SwitchingEntry {
    const switching = this._switching;

    if (!switching) {
      throw new Error('No switching entry');
    }

    if (ref !== switching.ref) {
      throw new Error('Switching does not match');
    }

    return switching;
  }

  private _startTransition(
    operation: RouterOperation,
    targetBuilder: () => RouteTarget,
    complete: () => void,
  ): void {
    if (this._transition) {
      this._queue.push([operation, targetBuilder, complete]);
      return;
    }

    const target = targetBuilder();

    const activeRouteEntry = this._active?.entry;

    const transitionRouteEntry = new RouteEntry(
      this,
      target.path,
      target.stateMap,
      target.previous,
      target.next,
      target.statePart,
    );

    runInAction(() => {
      this._transition = {
        operation,
        entry: transitionRouteEntry,
      };
    });

    // Wait initial render to register transition.
    void Promise.resolve()
      .then(() =>
        when(
          () =>
            (!activeRouteEntry || !activeRouteEntry.blockedByLeaving) &&
            !transitionRouteEntry.blockedByEntering,
        ),
      )
      .then(() => {
        this._finishTransition();
        complete();
      });
  }

  private _finishTransition(): void {
    const {operation, entry} = this._requireTransition();

    runInAction(() => {
      entry._mergePendingStatePart();

      this._active = {
        operation,
        entry,
      };

      this._transition = undefined;

      const next = this._queue.shift();

      if (next) {
        const [operation, targetBuilder, complete] = next;

        this._startTransition(operation, targetBuilder, complete);
      }
    });
  }

  private _buildStateMap(
    path: string[],
    stateMapUpdate: Map<number, object>,
    active: RouteEntry | undefined,
  ): Map<number, object> {
    const {path: activePath, stateMap: activeStateMap} = active ?? {
      path: [],
      stateMap: new Map<number, object>(),
    };

    const stateInputMap = this._stateInputMap;

    const stateMap = new Map<number, object>();

    const commonStartKeys = getCommonStartOfTwoArray(
      path,
      activePath,
    ) as RouteKey[];

    let upperSchemas = this._schemas;

    for (const [index, key] of commonStartKeys.entries()) {
      const schema = getChildSchema(upperSchemas, key);

      if (stateMapUpdate.has(index)) {
        let state: object | undefined;
        let stateFunctionAndInput: [Function, unknown] | undefined;

        if ('$state' in schema) {
          // It is legit for this to be undefined in case of $state is a function
          // accepting no argument or undefined argument.
          const stateUpdate = stateMapUpdate.get(index);

          const schemaState = schema.$state;

          if (typeof schemaState === 'function') {
            state = schemaState(stateUpdate, createMergedState(stateMap));
            stateFunctionAndInput = [schemaState, stateUpdate];
          } else {
            state = stateUpdate;
          }
        }

        assertState(state, key);

        const observableState = observable(state);

        if (stateFunctionAndInput) {
          const [stateFunction, stateInput] = stateFunctionAndInput;
          stateInputMap.set([observableState, stateFunction], stateInput);
        }

        stateMap.set(index, observableState);
      } else {
        stateMap.set(index, activeStateMap.get(index)!);
      }

      upperSchemas = schema;
    }

    for (const [index, key] of (path as RouteKey[])
      .slice(commonStartKeys.length)
      .entries()) {
      const schema = getChildSchema(upperSchemas, key);

      const stateIndex = commonStartKeys.length + index;

      let state: object | undefined;
      let stateFunctionAndInput: [Function, unknown] | undefined;

      if ('$state' in schema) {
        const schemaState = schema.$state;

        if (stateMapUpdate.has(stateIndex)) {
          const stateUpdate = stateMapUpdate.get(stateIndex);

          if (typeof schemaState === 'function') {
            state = schemaState(stateUpdate, createMergedState(stateMap));
            stateFunctionAndInput = [schemaState, stateUpdate];
          } else {
            state = stateUpdate;
          }
        } else {
          if (typeof schemaState === 'function') {
            state = schemaState(undefined, createMergedState(stateMap));
          } else {
            state = schemaState;
          }
        }
      } else {
        state = {};
      }

      assertState(state, key);

      const observableState = observable(state);

      if (stateFunctionAndInput) {
        const [stateFunction, stateInput] = stateFunctionAndInput;
        stateInputMap.set([observableState, stateFunction], stateInput);
      }

      stateMap.set(stateIndex, observableState);

      upperSchemas = schema;
    }

    return stateMap;
  }
}

export type RouterOperation = 'reset' | 'push' | 'replace' | 'back' | 'forward';

export type ActiveEntry = {
  operation: RouterOperation;
  entry: RouteEntry;
};

export type TransitionEntry = {
  operation: RouterOperation;
  entry: RouteEntry;
};

export type SwitchingEntry = {
  operation: RouterOperation;
  entry: RouteEntry;
  switchingStateObservable: IObservableValue<object>;
  ref: object;
};

export type MatchEntry = ActiveEntry | TransitionEntry | SwitchingEntry;

export type RouterSetResult = {
  $completed: Promise<void>;
};

export type Router<
  TSchemaRecord extends SchemaRecord,
  TSwitchingState extends object,
> = RouterClass<TSwitchingState> & {
  [TKey in Extract<keyof TSchemaRecord, RouteKey>]: RouteType_<
    ChildSchemaFallback_<TSchemaRecord[TKey]>,
    TSwitchingState,
    {},
    [TKey]
  >;
};

export type RouterSwitchingState_<TRouter> =
  TRouter extends RouterClass<infer TSwitchingState> ? TSwitchingState : never;

export type RouterSwitchingState<TRouter extends Router__> =
  RouterSwitchingState_<TRouter>;

export type RouterSwitching_<TRouter> = RouteSwitching<
  RouterSwitchingState_<TRouter>
>;

export type RouterSwitching<TRouter extends Router__> =
  RouterSwitching_<TRouter>;

export type SnapshotEntry = {
  path: string[];
  /**
   * Indexed by path segment index; and the value is the index of the state in
   * snapshot. Using a separate states array to preserve referencing same
   * objects by different entries.
   */
  states: SnapshotState[];
  previous?: SnapshotEntry;
  next?: SnapshotEntry;
};

export type SnapshotState = number | {value: unknown};

export type Snapshot = {
  operation: RouterOperation;
  entry: SnapshotEntry;
  objects: object[];
};
