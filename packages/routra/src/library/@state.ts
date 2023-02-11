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
