import {createMergedObjectProxy} from './@utils.js';

export function mergeStateMapWithPart(
  path: string[],
  stateMap: Map<number, object>,
  statePart: object,
): void {
  const states = path
    .map((_key, index): object => stateMap.get(index)!)
    .reverse();

  const pendingStatePartMap = new Map(Object.entries(statePart));

  for (const state of states) {
    for (const [statePartKey, value] of pendingStatePartMap) {
      if (statePartKey in state) {
        (state as any)[statePartKey] = value;
        pendingStatePartMap.delete(statePartKey);
      }
    }
  }

  if (pendingStatePartMap.size > 0) {
    throw new Error(
      `Failed to find value of ${Array.from(pendingStatePartMap.keys(), key =>
        JSON.stringify(key),
      ).join('/')} to update`,
    );
  }
}

export function createMergedState(stateMap: Map<number, object>): object {
  const states = Array.from(stateMap.values()).reverse();

  return createMergedObjectProxy(states);
}

export function assertState<T>(
  state: T,
  key: string,
): asserts state is Exclude<T, undefined> {
  if (state === undefined) {
    throw new Error(
      `State ${JSON.stringify(
        key,
      )} is missing and no default value is provided`,
    );
  }
}
