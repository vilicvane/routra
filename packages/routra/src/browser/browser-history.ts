/**
 * This was the soul of
 * [boring-router](https://github.com/mufancom/boring-router), now it lives with
 * routra. 🍻
 */

import Debug from 'debug';

const debug = Debug('routra-browser:browser-history');

export type BrowserHistoryChangeCallbackRemover = () => void;

export type BrowserHistoryEntry<TData> = {
  readonly ref: string;
  readonly data: TData | undefined;
};

export type BrowserHistorySnapshot<TData> = {
  readonly entries: readonly BrowserHistoryEntry<TData>[];
  readonly active: number;
};

export type BrowserHistoryChangeReason =
  | 'reset'
  | 'push'
  | 'replace'
  | 'restore'
  | number;

export type BrowserHistoryChangeCallback<TData> = (
  snapshot: BrowserHistorySnapshot<TData>,
  reason: BrowserHistoryChangeReason,
) => void;

export type BrowserHistoryNavigateAwayHandler = (href: string) => void;

const NAVIGATE_AWAY_HANDLER_DEFAULT: BrowserHistoryNavigateAwayHandler =
  href => {
    location.href = href;
  };

export type BrowserHistoryOptions = {
  /**
   * URL prefix, ignored if `hash` is enabled.
   */
  prefix?: string;
  /**
   * Use hash (#) for location pathname and search.
   *
   * This is not a compatibility option and does not make it compatible with
   * obsolete browsers.
   */
  hash?: boolean;
};

export class BrowserHistory<TData = never> {
  private _snapshot!: BrowserHistorySnapshot<TData>;

  private tracked!: BrowserHistorySnapshot<TData>;

  private restoring = false;

  private restoringPromise = Promise.resolve();
  private restoringPromiseResolver: (() => void) | undefined;

  private session!: number;

  private prefix: string;
  private hash: boolean;

  private changeCallbackSet = new Set<BrowserHistoryChangeCallback<TData>>();

  constructor({prefix = '', hash = false}: BrowserHistoryOptions = {}) {
    this.prefix = prefix;
    this.hash = hash;

    window.addEventListener('popstate', this.onPopState);

    this.reset();
  }

  private reset(): void {
    console.assert(!this.restoring);

    this.session = Date.now();

    const state = history.state as BrowserHistoryState<TData> | undefined;

    let data: TData | undefined;

    history.replaceState(
      {
        index: 0,
        session: this.session,
        data: state?.data,
      } satisfies BrowserHistoryState<TData>,
      '',
    );

    const entries: BrowserHistoryEntry<TData>[] = [
      {
        ref: this.getRefByHRef(this.url),
        data,
      },
    ];

    this._snapshot = this.tracked = {
      entries,
      active: 0,
    };
  }

  get snapshot(): BrowserHistorySnapshot<TData> {
    return this._snapshot;
  }

  get ref(): string {
    return this.snapshot.entries[this.snapshot.active].ref;
  }

  get index(): number {
    return this.snapshot.active;
  }

  get length(): number {
    return this.snapshot.entries.length;
  }

  get url(): string {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  private get hashPrefix(): string {
    return `${location.pathname}${location.search}`;
  }

  listen(
    callback: BrowserHistoryChangeCallback<TData>,
  ): BrowserHistoryChangeCallbackRemover {
    callback(this.snapshot, 'reset');

    this.changeCallbackSet.add(callback);

    return () => {
      this.changeCallbackSet.delete(callback);
    };
  }

  getHRefByRef(ref: string): string {
    if (this.hash) {
      return `${this.hashPrefix}#${ref}`;
    } else {
      return `${this.prefix}${ref}`;
    }
  }

  getRefByHRef(href: string): string {
    if (this.hash) {
      const index = href.indexOf('#');

      if (index >= 0) {
        const ref = href.slice(index + 1);

        if (ref) {
          return ref;
        }
      }

      return '/';
    } else {
      const prefix = this.prefix;

      let ref = href.startsWith(prefix) ? href.slice(prefix.length) : href;

      const hashIndex = ref.indexOf('#');

      if (hashIndex >= 0) {
        ref = ref.slice(0, hashIndex);
      }

      return ref;
    }
  }

  async back(): Promise<void> {
    await this.restoringPromise;

    history.back();
  }

  async forward(): Promise<void> {
    await this.restoringPromise;

    history.forward();
  }

  async go(step: number): Promise<void> {
    await this.restoringPromise;

    history.go(step);
  }

  async push(ref: string, data?: TData): Promise<void> {
    return this._push(ref, data, true);
  }

  async replace(ref: string, data?: TData): Promise<void> {
    await this.restoringPromise;

    const snapshot = this.replaceEntry({
      ref,
      data,
    });

    debug('replace', snapshot);

    this._snapshot = snapshot;

    this.emitChange(snapshot, 'replace');
  }

  async restore(
    snapshot: BrowserHistorySnapshot<TData>,
    toEmitChange = false,
  ): Promise<void> {
    debug('restore', snapshot);

    this._snapshot = snapshot;

    if (this.restoring) {
      return;
    }

    debug('restore start');

    this.restoring = true;

    const promise = new Promise<void>(resolve => {
      this.restoringPromiseResolver = resolve;
    });

    this.restoringPromise = promise;

    this.stepRestoration();

    await promise;

    if (toEmitChange) {
      this.emitChange(this._snapshot, 'restore');
    }
  }

  async navigate(
    href: string,
    navigateAwayHandler = NAVIGATE_AWAY_HANDLER_DEFAULT,
  ): Promise<void> {
    const originalHRef = href;

    const groups = /^([\w\d]+:)?\/\/([^/?]+)(.*)/.exec(href);

    if (groups) {
      const [, protocol, host, rest] = groups;

      if (
        (protocol && protocol !== location.protocol) ||
        host !== location.host
      ) {
        navigateAwayHandler(originalHRef);
        return;
      }

      href = rest.startsWith('/') ? rest : `/${rest}`;
    }

    const prefix = this.prefix;

    if (!href.startsWith(prefix)) {
      navigateAwayHandler(originalHRef);
      return;
    }

    const ref = href.slice(prefix.length);

    await this.push(ref);
  }

  private onPopState = (event: PopStateEvent): void => {
    const {entries: trackedEntries, active: trackedActiveIndex} = this.tracked;

    const state = event.state as BrowserHistoryState<TData> | null;

    // When using hash mode, entering a new hash directly in the browser will
    // also trigger popstate. And in that case state is null.
    if (!state) {
      void this._push(this.getRefByHRef(location.href), undefined, false);
      return;
    }

    if (state.session !== this.session) {
      this.reset();
      this.emitChange(this._snapshot, 'reset');
      return;
    }

    const {index} = state;

    if (index === trackedActiveIndex) {
      console.error('Unexpected history state index.');
      return;
    }

    const reason: BrowserHistoryChangeReason = index - trackedActiveIndex;

    const entries = [...trackedEntries];

    const snapshot: BrowserHistorySnapshot<TData> = {
      entries,
      active: index,
    };

    this.tracked = snapshot;

    if (this.restoring) {
      this.stepRestoration();
      return;
    }

    this._snapshot = snapshot;

    debug('pop', snapshot);

    this.emitChange(snapshot, reason);
  };

  private stepRestoration(): void {
    debug('step restoration');
    debug('expected', this._snapshot);
    debug('tracked', this.tracked);

    const expected = this._snapshot;
    const tracked = this.tracked;

    const {entries: expectedEntries} = expected;
    const {entries: trackedEntries, active: trackedActiveIndex} = tracked;

    const lastExpectedIndex = expectedEntries.length - 1;
    const lastTrackedIndex = trackedEntries.length - 1;

    const minLength = Math.min(expectedEntries.length, trackedEntries.length);

    let firstMismatchedIndex = 0;

    for (
      firstMismatchedIndex;
      firstMismatchedIndex < minLength;
      firstMismatchedIndex++
    ) {
      const expectedEntry = expectedEntries[firstMismatchedIndex];
      const trackedEntry = trackedEntries[firstMismatchedIndex];

      if (!isHistoryEntryEqual(expectedEntry, trackedEntry)) {
        break;
      }
    }

    if (
      firstMismatchedIndex > lastExpectedIndex &&
      (lastExpectedIndex === lastTrackedIndex || lastExpectedIndex === 0)
    ) {
      // 1. Exactly identical.
      // 2. Not exactly identical but there's not much that can be done:
      //    ```
      //    expected  a
      //    tracked   a -> b
      //                   ^ mismatch
      //    ```
      //    In this case we cannot remove the extra entries.

      this.restoreActive();
      return;
    }

    if (
      // expected  a -> b -> c
      // tracked   a -> d -> e
      //                ^ mismatch
      //                     ^ active
      trackedActiveIndex > firstMismatchedIndex ||
      // expected  a -> b
      // tracked   a -> b -> c
      //                     ^ mismatch
      //                     ^ active
      trackedActiveIndex > lastExpectedIndex ||
      // expected  a -> b
      // tracked   a -> b -> c
      //                     ^ mismatch
      //                ^ active
      // expected  a -> b
      // tracked   a -> c -> d
      //                ^ mismatch
      //                ^ active
      (trackedActiveIndex === lastExpectedIndex &&
        trackedActiveIndex < lastTrackedIndex)
    ) {
      history.back();
      return;
    }

    if (trackedActiveIndex === firstMismatchedIndex) {
      this.replaceEntry(expectedEntries[trackedActiveIndex]);
    }

    for (const entry of expectedEntries.slice(trackedActiveIndex + 1)) {
      this.pushEntry(entry, true);
    }

    this.restoreActive();
  }

  private restoreActive(): void {
    debug('restore active');
    debug('expected', this._snapshot);
    debug('tracked', this.tracked);

    const {active: expectedActiveIndex} = this._snapshot;
    const {active: trackedActiveIndex} = this.tracked;

    if (trackedActiveIndex < expectedActiveIndex) {
      history.forward();
    } else if (trackedActiveIndex > expectedActiveIndex) {
      history.back();
    } else {
      this.completeRestoration();
    }
  }

  private completeRestoration(): void {
    this.restoring = false;

    if (this.restoringPromiseResolver) {
      this.restoringPromiseResolver();
    }

    this.restoringPromiseResolver = undefined;

    debug('restore end');
    debug('expected', this._snapshot);
    debug('tracked', this.tracked);
  }

  private async _push(
    ref: string,
    data: TData | undefined,
    toPushState: boolean,
  ): Promise<void> {
    if (ref === this.ref) {
      return this.replace(ref, data);
    }

    await this.restoringPromise;

    const snapshot = this.pushEntry(
      {
        ref,
        data,
      },
      toPushState,
    );

    debug('push', snapshot);

    this._snapshot = snapshot;

    this.emitChange(snapshot, 'push');
  }

  private pushEntry(
    entry: BrowserHistoryEntry<TData>,
    toPushState: boolean,
  ): BrowserHistorySnapshot<TData> {
    debug('push entry', entry, toPushState);
    debug('tracked', this.tracked);

    const {ref, data} = entry;

    const {entries, active: trackedActiveIndex} = this.tracked;

    const index = trackedActiveIndex + 1;

    const snapshot: BrowserHistorySnapshot<TData> = {
      entries: [...entries.slice(0, index), {ref, data}],
      active: index,
    };

    this.tracked = snapshot;

    if (toPushState) {
      const href = this.getHRefByRef(ref);

      try {
        history.pushState(
          {
            index,
            session: this.session,
            data,
          } satisfies BrowserHistoryState<TData>,
          '',
          href,
        );
      } catch (error) {
        history.pushState(
          {
            index,
            session: this.session,
            data: undefined,
          } satisfies BrowserHistoryState<TData>,
          '',
          href,
        );
      }
    }

    return snapshot;
  }

  private replaceEntry(
    entry: BrowserHistoryEntry<TData>,
  ): BrowserHistorySnapshot<TData> {
    debug('replace entry', entry);
    debug('tracked', this.tracked);

    const {entries, active: trackedActiveIndex} = this.tracked;

    const {ref, data} = entry;

    const snapshot: BrowserHistorySnapshot<TData> = {
      entries: [
        ...entries.slice(0, trackedActiveIndex),
        {ref, data},
        ...entries.slice(trackedActiveIndex + 1),
      ],
      active: trackedActiveIndex,
    };

    this.tracked = snapshot;

    const href = this.getHRefByRef(ref);

    try {
      history.replaceState(
        {
          index: trackedActiveIndex,
          session: this.session,
          data,
        } satisfies BrowserHistoryState<TData>,
        '',
        href,
      );
    } catch (error) {
      history.replaceState(
        {
          index: trackedActiveIndex,
          session: this.session,
          data: undefined,
        } satisfies BrowserHistoryState<TData>,
        '',
        href,
      );
    }

    return snapshot;
  }

  private emitChange(
    snapshot: BrowserHistorySnapshot<TData>,
    reason: BrowserHistoryChangeReason,
  ): void {
    debug('emit change', snapshot, reason);

    for (const callback of this.changeCallbackSet) {
      try {
        callback(snapshot, reason);
      } catch (error) {
        console.error(error);
      }
    }
  }
}

type BrowserHistoryState<TData> = {
  index: number;
  session: number;
  data: TData | undefined;
};

function isHistoryEntryEqual<TData>(
  x: BrowserHistoryEntry<TData>,
  y: BrowserHistoryEntry<TData>,
): boolean {
  return x.ref === y.ref && JSON.stringify(x.data) === JSON.stringify(y.data);
}
