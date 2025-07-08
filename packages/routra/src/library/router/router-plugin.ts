import type {RouteSnapshotSegment} from '../route/index.js';

import type {Router__} from './router.js';

export type RouterPlugin = {
  setup(router: Router__): void;
  getRouteRef(segments: RouteSnapshotSegment[]): string | undefined;
};
