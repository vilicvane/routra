import {autorun} from 'mobx';
import type {
  RouteClass__,
  Router__,
  Snapshot,
  SnapshotEntry,
  SnapshotState,
} from 'routra';

import type {
  BrowserHistoryChangeCallbackRemover,
  BrowserHistoryEntry,
  BrowserHistorySnapshot,
} from './browser-history.js';
import {BrowserHistory} from './browser-history.js';

export function connect(
  router: Router__,
  {
    history = new BrowserHistory(),
    segments: segmentsConverters = {
      routraToBrowser: segments => segments,
      browserToRoutra: segments => segments,
    },
    reset,
  }: {
    history?: BrowserHistory<void>;
    segments?: {
      routraToBrowser: (segments: string[]) => string[];
      browserToRoutra: (segments: string[]) => string[];
    };
    reset?: RouteClass__;
  } = {},
): BrowserHistoryChangeCallbackRemover {
  const routerAutorunDisposer = autorun(() => {
    const snapshot = router.$snapshot;

    if (snapshot) {
      history
        .restore(convertRoutraSnapshotToBrowserHistorySnapshot(snapshot))
        .catch(console.error);
    }
  });

  const historyChangeCallbackRemover = history.listen((snapshot, reason) => {
    switch (reason) {
      case 'reset':
        try {
          router.$restore(
            convertBrowserHistorySnapshotToRoutraSnapshot(snapshot),
          );
        } catch (error) {
          console.error(error);

          if (reset) {
            reset.$reset();
          }
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

  return () => {
    routerAutorunDisposer();
    historyChangeCallbackRemover();
  };

  function convertBrowserHistorySnapshotToRoutraSnapshot({
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
        path: segmentsConverters.browserToRoutra(path),
        states,
      },
      objects: [],
    };
  }

  function convertRoutraSnapshotToBrowserHistorySnapshot({
    entry,
    objects,
  }: Snapshot): BrowserHistorySnapshot<void> {
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
        segmentsConverters
          .routraToBrowser(entry.path)
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

export function getRouteRef(route: RouteClass__): string {
  return (
    route
      ._snapshot_segments()
      .map(({name, state}) => `/${name}:${encodeDataUriComponent(state)}`)
      .join('') || '/'
  );
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
