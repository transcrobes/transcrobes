import { IntervalCollection } from "./interval-collection.model";

export const intervalCollection = new IntervalCollection();
export const NAME_PREFIX = "4647946f-9b6c-4cba-b17b-999b961907cd-";

// @ts-ignore
globalThis.setInterval = (handler: any, interval?: any, ...args: any[]): number => {
  let intervalName = "";
  for (const arg of args) {
    if (typeof arg === "string" && arg.startsWith(NAME_PREFIX)) {
      intervalName = arg;
    }
  }
  return intervalCollection.add(
    () => {
      handler();
    },
    intervalName,
    interval,
    args,
  );
};

// @ts-ignore
globalThis.clearInterval = function (id: number | string): void {
  intervalCollection.remove(id);
};
