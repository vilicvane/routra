import _ from 'lodash';
import {computed} from 'mobx';

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

export function getCommonStartOfTwoArray<T>(a: T[], b: T[]): T[] {
  const minLength = Math.min(a.length, b.length);

  let index = 0;

  for (; index < minLength; index++) {
    if (a[index] !== b[index]) {
      break;
    }
  }

  return a.slice(0, index);
}

export function isArrayStartedWith<T>(target: T[], comparison: T[]): boolean {
  if (target.length < comparison.length) {
    return false;
  }

  let index = 0;

  for (; index < comparison.length; index++) {
    if (target[index] !== comparison[index]) {
      return false;
    }
  }

  return true;
}

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
      getPrototypeOf(_target) {
        const prototypes = objectsComputed
          .get()
          .map(object => Reflect.getPrototypeOf(object))
          .filter((prototype): prototype is object => prototype !== null);

        if (prototypes.length === 0) {
          return null;
        } else {
          return createMergedObjectProxy(prototypes);
        }
      },
      getOwnPropertyDescriptor(_target, key) {
        for (const object of objectsComputed.get()) {
          const descriptor = Reflect.getOwnPropertyDescriptor(object, key);

          if (descriptor) {
            if (descriptor.configurable === false) {
              descriptor.configurable = true;
            }

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
