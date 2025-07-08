import type {RouteSnapshotSegment} from '../route/index.js';

import type {Router__} from './router.js';

export abstract class RouterPlugin {
  abstract setup(router: Router__): void;
  abstract getRouteRef(segments: RouteSnapshotSegment[]): string | undefined;
}
