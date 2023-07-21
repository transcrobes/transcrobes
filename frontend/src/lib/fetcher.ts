import fetchBuilder, { RequestInitWithRetry } from "fetch-retry";
import { AdminStore, store } from "../app/createStore";
import { throttledRefreshToken } from "../features/user/userSlice";
import { DEFAULT_RETRIES } from "./types";

export type OutputType = "json" | "text" | "blob" | "arrayBuffer" | "formData";

export class Fetcher {
  #fetch;
  store: AdminStore;
  retries: number;

  // constructor(store: AdminStore, retries = DEFAULT_RETRIES) {
  constructor(store: AdminStore, retries = DEFAULT_RETRIES) {
    this.fetchPlus = this.fetchPlus.bind(this);
    this.retries = retries;
    this.store = store;
    this.#fetch = fetchBuilder(fetch, {
      // retries: DEFAULT_RETRIES,
      retryDelay: (attempt: number, error: Error | null, response: Response | null) => {
        return Math.pow(2, attempt) * 1000; // 1000, 2000, 4000
      },
      retryOn: function (attempt: number, error: Error | null, response: Response | null) {
        // retry on any network error, or 4xx or 5xx status codes
        // if (error !== null || (response && response.status >= 400)) {
        if (attempt > 0) {
          console.debug(`Attempt number ${attempt + 1}`, response?.url, response?.headers);
        }
        if (attempt >= retries) {
          // Maybe I should raise here?
          return false;
        }
        if (error !== null) {
          return true;
        } else if (response && response.status >= 400) {
          if (response.status === 401 || response.status === 403) {
            store.dispatch(throttledRefreshToken() as any);
            return false; // we have a bad token, no point trying again as we can't update it now...
          }
          return true;
        }
        return false;
      },
    });
  }
  public async fetchPlus<T = unknown>(
    url: string | URL,
    body?: BodyInit,
    retries?: number,
    forcePost = false,
    fileType: OutputType = "json",
  ): Promise<T> {
    const fetched = await this.fetchPlusResponse(url, body, retries, forcePost, fileType);
    if (!fetched.ok) throw new Error("Fetch failed: " + fetched.statusText);
    return await fetched[fileType]();
  }
  public async fetchPlusResponse(
    url: string | URL,
    body?: BodyInit,
    retries?: number,
    forcePost = false,
    fileType: OutputType = "json",
  ): Promise<Response> {
    const lurl = typeof url === "string" ? url : url.href;
    // TODO: properly determine whether the retries here actually works...
    const opts: RequestInitWithRetry = retries ? { retries: retries } : {};
    if (forcePost || body) {
      opts.method = "POST";
      opts.body = typeof body === "string" || body instanceof FormData ? body : JSON.stringify(body);
    }
    opts.credentials = "include";
    opts.headers = {
      Authorization: "Bearer " + this.store.getState().userData.user.accessToken,
    };
    if (fileType === "json") {
      opts.headers["Accept"] = "application/json";
    } else if (fileType === "arrayBuffer" || fileType === "blob") {
      opts.headers["Accept"] = "application/octet-stream";
    }
    if (!(body instanceof FormData)) {
      opts.headers["Content-Type"] = "application/json";
    }
    opts.cache = "no-cache";
    return await this.#fetch(lurl, opts);
  }
}

export const fetcher = new Fetcher(store);
