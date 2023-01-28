export function updateStateMapByPart(
  path: string[],
  observableStateMap: Map<string, object>,
  statePart: object,
): void {
  const observableStateEntries = path
    .map((key): [string, object] => [key, observableStateMap.get(key)!])
    .reverse();

  statePartKeyValue: for (const [statePartKey, value] of Object.entries(
    statePart,
  )) {
    for (const [pathKey, observableState] of observableStateEntries) {
      if (statePartKey in observableState) {
        if (Reflect.set(observableState, statePartKey, value)) {
          continue statePartKeyValue;
        } else {
          throw new Error(
            `Failed to update value of ${JSON.stringify(
              statePartKey,
            )} in ${JSON.stringify(pathKey)}`,
          );
        }
      }
    }

    throw new Error(
      `Failed to find value of ${JSON.stringify(statePartKey)} to update`,
    );
  }
}
