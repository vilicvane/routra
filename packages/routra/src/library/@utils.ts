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
