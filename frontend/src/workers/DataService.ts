export class DataService<T extends Object> {
  wrapped: T;
  proxy: T;
  chain: Promise<any>;

  constructor(wrapped: T) {
    this.wrapped = wrapped;
    this.proxy = this.#createProxy();
  }

  #runner = (_, method) => {
    return async (...args) => {
      return new Promise((resolve, reject) => {
        const result = this.chain.then(async () => {
          resolve(await this.wrapped[method](...args));
        });
        this.chain = result.catch((e) => {
          console.warn("Error in query in the parent", method, args, e);
          reject(e);
        });
        return result;
      });
    };
  };

  #createProxy() {
    return new Proxy<T>({} as T, {
      get: this.#runner,
      apply: this.#runner,
    });
  }
}
