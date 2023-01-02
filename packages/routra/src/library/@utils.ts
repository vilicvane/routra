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
