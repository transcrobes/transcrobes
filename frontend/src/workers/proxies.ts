import * as Comlink from "comlink";
import { ServiceWorkerDataManager } from "../data/types";
import { BackgroundWorkerDataManager } from "../extension/backgroundfn";

export interface ManagerProxy<T> {
  proxy: T;
}
export class ComlinkService<T extends object> extends EventTarget implements ManagerProxy<T> {
  #comlink: Comlink.Remote<T>;
  proxy: T;
  constructor(comlink: Comlink.Remote<T>) {
    super();
    this.#comlink = comlink;
    this.proxy = this.#createProxy();
  }
  #createProxy() {
    return new Proxy<T>({} as T, {
      get: (_, method) => {
        return async (...args) => {
          return new Promise((resolve, reject) => {
            this.#comlink
              [method](...args)
              .then(resolve)
              .catch(reject);
          });
        };
      },
    });
  }
}

export class WorkerDataManager<T extends Object> extends EventTarget implements ManagerProxy<T> {
  proxy: T;

  #managers: Map<string | number | symbol, ManagerProxy<Partial<T>>> = new Map();
  addManager(manager: { partial: ManagerProxy<Partial<T>>; keys: (keyof T)[] }) {
    for (const prop of manager.keys) {
      this.#managers.set(prop, manager.partial);
    }
  }

  constructor(managers?: { partial: ManagerProxy<Partial<T>>; keys: (keyof T)[] }[]) {
    super();
    for (const manager of managers ?? []) {
      this.addManager(manager);
    }
    this.proxy = this.#createProxy();
  }

  #provider(method: string | symbol) {
    return this.#managers.get(method.toString());
  }

  #createProxy() {
    return new Proxy<T>({} as T, {
      get: (_, method) => {
        return async (...args) => {
          return new Promise((resolve, reject) => {
            const prov = this.#provider(method);
            if (prov) {
              prov.proxy[method](...args)
                .then(resolve)
                .catch(reject);
            } else {
              reject(`Method ${method.toString()} not found in any of the data managers`);
            }
          });
        };
      },
    });
  }
}

export class WebServiceWorkerDataManager
  extends WorkerDataManager<ServiceWorkerDataManager>
  implements ManagerProxy<ServiceWorkerDataManager> {}

export class ExtServiceWorkerDataManager
  extends WorkerDataManager<BackgroundWorkerDataManager>
  implements ManagerProxy<BackgroundWorkerDataManager> {}
