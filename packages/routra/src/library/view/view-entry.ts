import {autorun, makeObservable, observable, runInAction} from 'mobx';

abstract class ViewEntry {
  readonly $key = getNextViewEntryKey();

  @observable
  protected _enteringEnabled = false;

  @observable
  protected _leavingEnabled = false;

  @observable
  protected _entered = false;

  @observable
  protected _left = false;

  private _autorunDisposer: () => void;

  constructor() {
    makeObservable(this);

    this._autorunDisposer = autorun(() => this._autorunUpdateTransitionBlock());
  }

  get $entering(): ViewTransitionActivity | false {
    if (!this._entering) {
      return false;
    }

    const that = this;

    return {
      complete(): void {
        if (!that._enteringEnabled) {
          throw new Error('Entering transition is not enabled');
        }

        if (that._entered) {
          return;
        }

        runInAction(() => {
          that._entered = true;
        });
      },
    };
  }

  get $leaving(): ViewTransitionActivity | false {
    if (!this._leaving) {
      return false;
    }

    const that = this;

    return {
      complete(): void {
        if (!that._leavingEnabled) {
          throw new Error('Leaving transition is not enabled');
        }

        if (that._left) {
          return;
        }

        runInAction(() => {
          that._left = true;
        });
      },
    };
  }

  $transition({entering, leaving}: ViewEntryRegisterTransitionOptions): void {
    runInAction(() => {
      this._enteringEnabled = entering;
      this._leavingEnabled = leaving;
    });
  }

  /** @internal */
  _dispose(): void {
    this._autorunDisposer();
  }

  protected abstract get _entering(): boolean;

  protected abstract get _leaving(): boolean;

  protected abstract _autorunUpdateTransitionBlock(): void;
}

export const AbstractViewEntry = ViewEntry;
export type IViewEntry = ViewEntry;

export interface ViewEntryRegisterTransitionOptions {
  entering: boolean;
  leaving: boolean;
}

export interface ViewTransitionActivity {
  complete(): void;
}

let lastViewEntryKey = 0;

function getNextViewEntryKey(): number {
  return ++lastViewEntryKey;
}
