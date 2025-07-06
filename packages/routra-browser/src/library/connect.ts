import {autorun} from 'mobx';
import type {RouteClass__, Router__, Snapshot, SnapshotState} from 'routra';

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
      case 'back':
      case 'forward':
        try {
          router[`$${reason}`]();
        } catch (error) {
          console.error(error);

          history
            .restore(
              convertRoutraSnapshotToBrowserHistorySnapshot(router.$snapshot!),
            )
            .catch(console.error);
        }
        break;
      case 'restore':
        break;
      default:
        console.error('Unexpected history change reason:', reason);
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
    const entry = entries.find(({id}) => id === active)!;

    const segments = entry.ref.match(/\/(?!\$(?:forward|back)$)[^/]+/g) ?? [];

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
    objects: states,
  }: Snapshot): BrowserHistorySnapshot<void> {
    const segments = segmentsConverters.routraToBrowser(entry.path);

    const active = 1;

    const entries: BrowserHistoryEntry<void>[] = [
      {
        id: active,
        ref:
          segments
            .map((segment, index) => {
              const state = entry.states[index];

              let segmentData: string;

              if (typeof state === 'number') {
                const encodedData = encodeDataUriComponent(states[state]);

                segmentData = encodedData === '' ? '' : `:${encodedData}`;
              } else {
                segmentData = `:${encodeDataUriComponent(state.value)}`;
              }

              return `/${segment}${segmentData}`;
            })
            .join('') || '/',
        data: undefined,
      },
    ];

    if (entry.previous) {
      entries.unshift({
        id: active - 1,
        ref: '/$back',
        data: undefined,
      });
    }

    if (entry.next) {
      entries.push({
        id: active + 1,
        ref: '/$forward',
        data: undefined,
      });
    }

    return {entries, active};
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
