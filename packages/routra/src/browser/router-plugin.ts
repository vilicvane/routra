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

export class BrowserRouterPlugin extends RouterPlugin {
  constructor(
    private defaultRoute: RouteClass__,
    private history = new BrowserHistory<void>(),
    private segmentsConverters: {
      routraToBrowser: (segments: string[]) => string[];
      browserToRoutra: (segments: string[]) => string[];
    } = {
      routraToBrowser: segments => segments,
      browserToRoutra: segments => segments,
    },
  ) {
    super();
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
        default:
          try {
            router.$step(reason).$go();
          } catch (error) {
            console.error(error);

            location.reload();
          }
          break;
      }
    });
  }

  getRouteRef(segments: RouteSnapshotSegment[]): string | undefined {
    return (
      segments
        .map(({name, state}) => `/${name}:${encodeDataUriComponent(state)}`)
        .join('') || '/'
    );
  }

  private segmentsRoutraToBrowser(segments: string[]): string[] {
    if (isSegmentsEqual(segments, this.defaultRoute.$path)) {
      segments = [];
    }

    return this.segmentsConverters.routraToBrowser(segments);
  }

  private segmentsBrowserToRoutra(segments: string[]): string[] {
    if (segments.length === 0) {
      segments = this.defaultRoute.$path;
    }

    return this.segmentsConverters.browserToRoutra(segments);
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
          ? gracefulDecodeDataUriComponent(encodedData)
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
    const that = this;

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

    function getRef(entry: SnapshotEntry): string {
      return (
        that
          .segmentsRoutraToBrowser(entry.path)
          .map((segment, index) => {
            const state = entry.states[index];

            let segmentData: string;

            if (typeof state === 'number') {
              const encodedData = encodeDataUriComponent(objects[state]);

              segmentData = encodedData === '' ? '' : `:${encodedData}`;
            } else {
              segmentData = `:${encodeDataUriComponent(state.value)}`;
            }

            return `/${segment}${segmentData}`;
          })
          .join('') || '/'
      );
    }
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

function gracefulDecodeDataUriComponent(encodedData: string): unknown {
  if (encodedData.includes('=')) {
    try {
      return Object.fromEntries(new URLSearchParams(encodedData));
    } catch {
      // ignore
    }
  }

  try {
    return JSON.parse(decodeURIComponent(encodedData));
  } catch {
    return undefined;
  }
}

function encodeDataUriComponent(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data).filter(
      ([, value]) => value !== undefined,
    );

    if (entries.every(([, value]) => typeof value === 'string')) {
      return new URLSearchParams(entries).toString();
    }
  }

  return encodeURIComponent(JSON.stringify(data));
}
