import _ from 'lodash';

export function getCommonStartOfTwoArray<T>(a: T[], b: T[]): T[] {
  let minLength = Math.min(a.length, b.length);

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
      has(target, key) {
        for (let observableState of objects) {
          if (key in observableState) {
            return true;
          }
        }

        return key in target;
      },
      get(target, key) {
        for (let observableState of objects) {
          if (key in observableState) {
            return (observableState as any)[key];
          }
        }

        return (target as any)[key];
      },
      getOwnPropertyDescriptor(target, key) {
        for (let observableState of objects) {
          let descriptor = Reflect.getOwnPropertyDescriptor(
            observableState,
            key,
          );

          if (descriptor) {
            return descriptor;
          }
        }

        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      ownKeys() {
        return _.uniq(objects.flatMap(object => Object.keys(object)));
      },
    },
  );
}
