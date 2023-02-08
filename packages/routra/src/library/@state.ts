import {observable} from 'mobx';

export function mergeStateMapWithPart(
  path: string[],
  stateMap: Map<number, object>,
  statePart: object,
): Map<number, object> {
  const stateEntries = path
    .map((_key, index): [number, object] => [index, stateMap.get(index)!])
    .reverse();

  const pendingStatePartMap = new Map(Object.entries(statePart));

  const mergedStateMap = new Map<number, object>();

  for (const [index, state] of stateEntries) {
    const mergedState: Record<string, unknown> = {...state};

    for (const [statePartKey, value] of pendingStatePartMap) {
      if (statePartKey in state) {
        mergedState[statePartKey] = value;

        pendingStatePartMap.delete(statePartKey);
      }
    }

    mergedStateMap.set(index, observable(mergedState));
  }

  if (pendingStatePartMap.size > 0) {
    throw new Error(
      `Failed to find value of ${Array.from(pendingStatePartMap.keys(), key =>
        JSON.stringify(key),
      ).join('/')} to update`,
    );
  }

  return mergedStateMap;
}
