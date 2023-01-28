import _ from 'lodash';
import {computed} from 'mobx';

import type {RouteNode__} from './route';
import type {Router_, Router__} from './router';
import type {Transition} from './transition';

export type RouteView<TRoute extends RouteNode__> = TRoute['$views'][number];

export type RouterTransition<TRouter extends Router__> = Transition<
  RouterTransitionState<TRouter>
>;

export type RouterTransitionState<TRouter extends Router__> =
  TRouter extends Router_<unknown, unknown, infer TTransitionState>
    ? TTransitionState
    : never;

export type OverrideObject_<TObject, TOverride> = Omit<
  TObject,
  keyof TOverride
> &
  TOverride;

export type MultiOverrideObject_<TObject, TOverrides> = TOverrides extends [
  infer TOverride,
  ...infer TRestOverrides,
]
  ? MultiOverrideObject_<
      Omit<TObject, keyof TOverride> & TOverride,
      TRestOverrides
    >
  : TObject;

export function createMergedObjectProxy(
  objects: object[] | (() => object[]),
): object {
  const objectsGetter =
    typeof objects === 'function' ? objects : (): object[] => objects;

  const objectsComputed = computed(() => objectsGetter());

  return new Proxy(
    {},
    {
      has(_target, key) {
        for (const object of objectsComputed.get()) {
          if (key in object) {
            return true;
          }
        }

        return false;
      },
      get(_target, key) {
        for (const object of objectsComputed.get()) {
          if (key in object) {
            return (object as any)[key];
          }
        }

        return undefined;
      },
      set(_target, key, value) {
        for (const object of objectsComputed.get()) {
          if (key in object) {
            return Reflect.set(object, key, value);
          }
        }

        return false;
      },
      getOwnPropertyDescriptor(_target, key) {
        for (const object of objectsComputed.get()) {
          const descriptor = Reflect.getOwnPropertyDescriptor(object, key);

          if (descriptor) {
            return descriptor;
          }
        }

        return undefined;
      },
      ownKeys() {
        return _.uniq(
          objectsComputed.get().flatMap(object => Object.keys(object)),
        );
      },
    },
  );
}
