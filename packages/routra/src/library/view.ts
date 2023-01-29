import type {Route__} from './route';

export class View {
  constructor() {}

  get $entries(): ViewEntry[] {}
}

export class ViewEntry {
  $key: number;

  $route: Route__;

  constructor() {}
}
