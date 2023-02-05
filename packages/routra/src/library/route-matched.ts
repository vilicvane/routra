import type {RouteEntry} from './route-entry';

export class RouteMatch {
  constructor(private entry: RouteEntry, readonly transition: boolean) {}
}
