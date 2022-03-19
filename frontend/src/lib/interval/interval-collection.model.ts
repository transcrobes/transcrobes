import { originalClearInterval, originalSetInterval } from "./override";
import { Interval } from "./interval.model";

export class IntervalCollection {
  private _intervalCollection: Interval[] = [];

  public add(handler: any, name?: string, interval?: any, ...args: any[]) {
    if (name) {
      // If one with the same name exists already, we replace, not add a new one
      this.remove(name);
    }
    const id = originalSetInterval.apply(globalThis, [handler, interval, args]);
    this._intervalCollection.push({
      id,
      name: name || id.toString(),
      handler,
      interval,
      arguments: args,
      timestamp: Date.now(),
    });

    return id;
  }

  public remove(id: number | string): void {
    const intervalIndex = this._getIntervalIndexByIdOrName(id);
    let realId = 0;
    if (intervalIndex !== -1) {
      realId = this._intervalCollection.splice(intervalIndex, 1)[0].id as any;
    }
    if (realId > 0) {
      originalClearInterval.apply(globalThis, [realId]);
    }
  }

  public get(index: number): Interval {
    return this._intervalCollection[index];
  }

  public getAll(): Interval[] {
    return this._intervalCollection;
  }

  public getByName(name: string): Interval {
    return this._intervalCollection[this._getIntervalIndexByIdOrName(name)];
  }

  public getById(id: number): Interval {
    return this._intervalCollection[this._getIntervalIndexByIdOrName(id)];
  }

  public removeAll() {
    this._intervalCollection.forEach((interval: Interval) => {
      originalClearInterval.apply(globalThis, [interval.id]);
    });

    this._intervalCollection = [];
  }

  private _getIntervalIndexByIdOrName(intervalIdOrName: number | string): number {
    for (let i = 0; i < this._intervalCollection.length; i++) {
      if (
        this._intervalCollection[i].id === intervalIdOrName ||
        this._intervalCollection[i].name === intervalIdOrName
      ) {
        return i;
      }
    }

    return -1;
  }
}
