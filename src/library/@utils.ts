import _ from 'lodash';

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

export function createMergedObjectProxy(objects: object[]): object {
  return new Proxy(
    {},
    {
      has(_target, key) {
        for (const object of objects) {
          if (key in object) {
            return true;
          }
        }

        return false;
      },
      get(_target, key) {
        for (const object of objects) {
          if (key in object) {
            return (object as any)[key];
          }
        }

        return undefined;
      },
      set(_target, key, value) {
        for (const object of objects) {
          if (key in object) {
            return Reflect.set(object, key, value);
          }
        }

        return false;
      },
      getOwnPropertyDescriptor(_target, key) {
        for (const object of objects) {
          const descriptor = Reflect.getOwnPropertyDescriptor(object, key);

          if (descriptor) {
            return descriptor;
          }
        }

        return undefined;
      },
      ownKeys() {
        return _.uniq(objects.flatMap(object => Object.keys(object)));
      },
    },
  );
}
