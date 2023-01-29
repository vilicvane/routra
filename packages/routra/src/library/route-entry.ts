export class RouteEntry {
  private entering = 0;

  private leaving = 0;

  constructor(
    readonly path: string[],
    readonly stateMap: Map<number, object>,
    readonly previous: RouteEntry | undefined,
  ) {}
}
