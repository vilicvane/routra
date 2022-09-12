import type {__Route} from './route';

export type RouteView<TRoute extends __Route> = TRoute['$views'][number];
