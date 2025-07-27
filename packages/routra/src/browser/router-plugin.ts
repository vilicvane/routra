import {camelCase, kebabCase} from 'change-case';
import {autorun} from 'mobx';

import {
  type RouteClass__,
  type RouteSnapshotSegment,
  RouterPlugin,
  type Router__,
  type Snapshot,
  type SnapshotEntry,
  type SnapshotState,
} from '../library/index.js';

import type {
  BrowserHistoryEntry,
  BrowserHistorySnapshot,
} from './browser-history.js';
import {BrowserHistory} from './browser-history.js';

export type BrowserRouterPluginOptions = {
  default: RouteClass__;
  history?: BrowserHistory<void>;
  segments?: (
    | {
        routraToBrowser: (segments: string[]) => string[];
        browserToRoutra: (segments: string[]) => string[];
      }
    | {}
  ) &
    (
      | {
          encodeState: (state: unknown) => string;
          decodeState: (state: string) => unknown;
        }
      | {}
    ) & {
      disableFormDataEncoding?: boolean;
    };
};

type BrowserRouterPluginSegments = {
  routraToBrowser: (segments: string[]) => string[];
  browserToRoutra: (segments: string[]) => string[];
  encodeState: (state: unknown) => string;
  decodeState: (state: string) => unknown;
  disableFormDataEncoding: boolean;
};

export class BrowserRouterPlugin extends RouterPlugin {
  private defaultRoute: RouteClass__;

  private history: BrowserHistory<void>;

  private segments: BrowserRouterPluginSegments;

  constructor({
    default: defaultRoute,
    history = new BrowserHistory<void>(),
    segments = {},
  }: BrowserRouterPluginOptions) {
    super();

    const {
      routraToBrowser = segments => segments.map(segment => kebabCase(segment)),
      browserToRoutra = segments => segments.map(segment => camelCase(segment)),
      encodeState = JSON.stringify,
      decodeState = JSON.parse,
      disableFormDataEncoding = false,
    } = segments as Partial<BrowserRouterPluginSegments>;

    this.defaultRoute = defaultRoute;
    this.history = history;
    this.segments = {
      routraToBrowser,
      browserToRoutra,
      encodeState,
      decodeState,
      disableFormDataEncoding,
    };
  }

  setup(router: Router__): void {
    autorun(() => {
      const snapshot = router.$snapshot;

      if (snapshot) {
        this.history
          .restore(this.convertRoutraSnapshotToBrowserHistorySnapshot(snapshot))
          .catch(console.error);
      }
    });

    this.history.listen((snapshot, reason) => {
      switch (reason) {
        case 'reset':
          try {
            router.$restore(
              this.convertBrowserHistorySnapshotToRoutraSnapshot(snapshot),
            );
          } catch (error) {
            console.error(error);

            this.defaultRoute?.$reset();
          }
          break;
        case 'restore':
          break;
        case 'push':
        case 'replace':
          console.error('Unexpected history change reason:', reason);
          break;
        default: {
          const step = router.$step(reason);

          if (step) {
            step.$go();
          } else {
            location.reload();
          }

          break;
        }
      }
    });
  }

  getRouteRef(segments: RouteSnapshotSegment[]): string | undefined {
    return (
      segments
        .map(
          ({name, state}) => `/${name}:${this.encodeDataURIComponent(state)}`,
        )
        .join('') || '/'
    );
  }

  getRouteHRef(segments: RouteSnapshotSegment[]): string | undefined {
    const ref = this.getRouteRef(segments);

    return ref ? this.history.getHRefByRef(ref) : undefined;
  }

  private segmentsRoutraToBrowser(segments: string[]): string[] {
    if (isSegmentsEqual(segments, this.defaultRoute.$path)) {
      segments = [];
    }

    return this.segments.routraToBrowser(segments);
  }

  private segmentsBrowserToRoutra(segments: string[]): string[] {
    if (segments.length === 0) {
      segments = this.defaultRoute.$path;
    }

    return this.segments.browserToRoutra(segments);
  }

  private convertBrowserHistorySnapshotToRoutraSnapshot({
    entries,
    active,
  }: BrowserHistorySnapshot<void>): Snapshot {
    const entry = entries[active];

    const segments = entry.ref.match(/\/[^/]+/g) ?? [];

    const path: string[] = [];
    const states: SnapshotState[] = [];

    for (const segment of segments) {
      const [, name, encodedData] = segment.match(/^\/([^:/]*)(?::([^]+))?/)!;

      path.push(name);

      states.push({
        value: encodedData
          ? this.gracefulDecodeDataURIComponent(encodedData)
          : undefined,
      });
    }

    return {
      operation: 'reset',
      entry: {
        path: this.segmentsBrowserToRoutra(path),
        states,
      },
      objects: [],
    };
  }

  private convertRoutraSnapshotToBrowserHistorySnapshot({
    entry,
    objects,
  }: Snapshot): BrowserHistorySnapshot<void> {
    const getRef = (entry: SnapshotEntry): string => {
      return (
        this.segmentsRoutraToBrowser(entry.path)
          .map((segment, index) => {
            const state = entry.states[index];

            let segmentData: string;

            if (typeof state === 'number') {
              const encodedData = this.encodeDataURIComponent(objects[state]);

              segmentData = encodedData === '' ? '' : `:${encodedData}`;
            } else {
              segmentData = `:${this.encodeDataURIComponent(state.value)}`;
            }

            return `/${segment}${segmentData}`;
          })
          .join('') || '/'
      );
    };

    let active = 0;

    const entries: BrowserHistoryEntry<void>[] = [
      {
        ref: getRef(entry),
        data: undefined,
      },
    ];

    let previous = entry.previous;

    while (previous) {
      entries.unshift({
        ref: getRef(previous),
        data: undefined,
      });

      previous = previous.previous;

      active++;
    }

    let next = entry.next;

    while (next) {
      entries.push({
        ref: getRef(next),
        data: undefined,
      });

      next = next.next;
    }

    return {entries, active};
  }

  private gracefulDecodeDataURIComponent(encodedData: string): unknown {
    if (encodedData.includes('=')) {
      try {
        return Object.fromEntries(new URLSearchParams(encodedData));
      } catch {
        // ignore
      }
    }

    try {
      return this.segments.decodeState(decodeURIComponent(encodedData));
    } catch {
      return undefined;
    }
  }

  private encodeDataURIComponent(data: unknown): string {
    if (
      !this.segments.disableFormDataEncoding &&
      typeof data === 'object' &&
      data !== null
    ) {
      const entries = Object.entries(data).filter(
        ([, value]) => value !== undefined,
      );

      if (entries.every(([, value]) => typeof value === 'string')) {
        return new URLSearchParams(entries).toString();
      }
    }

    return encodeURIComponent(this.segments.encodeState(data));
  }
}

function isSegmentsEqual(x: string[], y: string[]): boolean {
  if (x.length !== y.length) {
    return false;
  }

  for (let index = 0; index < x.length; index++) {
    if (x[index] !== y[index]) {
      return false;
    }
  }

  return true;
}
