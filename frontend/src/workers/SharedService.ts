import { DataService } from "./DataService";
import { ManagerProxy } from "./proxies";

const PROVIDER_REQUEST_TIMEOUT = 1000;

export type ProxyMessage = {
  nonce: string;
  result?: any;
  error?: any;
};

export class SharedService<T extends Object> extends EventTarget implements ManagerProxy<T> {
  #serviceName: string;
  #clientId: Promise<string>;
  #portProviderFunc: () => MessagePort | Promise<MessagePort>;

  // This BroadcastChannel is used for client messaging. The provider
  // must have a separate BroadcastChannel in case the instance is
  // both client and provider.
  #clientChannel = new BroadcastChannel("SharedService");

  #onDeactivate: AbortController | null;
  #onClose: AbortController = new AbortController();

  // This is client state to track the provider. The provider state is
  // mostly managed within activate().
  #providerPort: Promise<MessagePort | null>;
  providerCallbacks: Map<string, { resolve; reject }> = new Map();
  #providerCounter = 0;
  #providerChangeCleanup: (() => void)[] = [];

  proxy: T;
  keys: (keyof T)[];

  constructor(serviceName: string, portProviderFunc: () => MessagePort | Promise<MessagePort>) {
    super();

    this.#serviceName = serviceName;
    this.#portProviderFunc = portProviderFunc;

    this.#clientId = this.#getClientId();

    // Connect to the current provider and future providers.
    this.#providerPort = this.#providerChange();
    this.#clientChannel.addEventListener(
      "message",
      ({ data }) => {
        if (data?.type === "provider" && data?.sharedService === this.#serviceName) {
          // A context (possibly this one) announced itself as the new provider.
          // Discard any old provider and connect to the new one.
          this.#closeProviderPort(this.#providerPort);
          this.#providerPort = this.#providerChange();
        }
      },
      { signal: this.#onClose.signal },
    );

    this.proxy = this.#createProxy();
  }

  activate() {
    if (this.#onDeactivate) return;

    // When acquire a lock on the service name then we become the service
    // provider. Only one instance at a time will get the lock; the rest
    // will wait their turn.
    this.#onDeactivate = new AbortController();
    navigator.locks.request(`SharedService-${this.#serviceName}`, { signal: this.#onDeactivate.signal }, async () => {
      // Get the port to request client ports.
      const port = await this.#portProviderFunc();
      port.start();

      // Listen for client requests. A separate BroadcastChannel
      // instance is necessary because we may be serving our own
      // request.
      const providerId = await this.#clientId;
      const broadcastChannel = new BroadcastChannel("SharedService");
      broadcastChannel.addEventListener(
        "message",
        async ({ data }) => {
          if (data?.type === "request" && data?.sharedService === this.#serviceName) {
            // Get a port to send to the client.
            const requestedPort = await new Promise<MessagePort>((resolve) => {
              port.addEventListener(
                "message",
                (event) => {
                  resolve(event.ports[0]);
                },
                { once: true },
              );
              port.postMessage(data.clientId);
            });

            this.#sendPortToClient(data, requestedPort);
          }
        },
        { signal: this.#onDeactivate?.signal },
      );

      // Tell everyone that we are the new provider.
      broadcastChannel.postMessage({
        type: "provider",
        sharedService: this.#serviceName,
        providerId,
      });

      // Release the lock only on user abort or context destruction.
      return new Promise((_, reject) => {
        this.#onDeactivate?.signal.addEventListener("abort", () => {
          broadcastChannel.close();
          reject(this.#onDeactivate?.signal.reason);
        });
      });
    });
  }

  deactivate() {
    this.#onDeactivate?.abort();
    this.#onDeactivate = null;
  }

  close() {
    this.deactivate();
    this.#onClose.abort();
    for (const { reject } of this.providerCallbacks.values()) {
      reject(new Error("SharedService closed"));
    }
  }

  async #sendPortToClient(message: any, port: Transferable) {
    // Return the port to the client via the service worker.
    const serviceWorker = await navigator.serviceWorker.ready;
    serviceWorker.active?.postMessage(message, [port]);
  }

  async #getClientId() {
    // Getting the clientId from the service worker accomplishes two things:
    // 1. It gets the clientId for this context.
    // 2. It ensures that the service worker is activated.
    //
    // It is possible to do this without polling but it requires about the
    // same amount of code and using fetch makes 100% certain the service
    // worker is handling requests.
    let clientId: string = "";
    while (!clientId) {
      clientId = await fetch("./clientId").then((response) => {
        if (response.ok) {
          return response.text();
        }
        console.warn("service worker not ready, retrying...");
        return new Promise((resolve) => setTimeout(resolve, 100));
      });
    }

    navigator.serviceWorker.addEventListener("message", (event) => {
      event.data.ports = event.ports;
      this.dispatchEvent(new MessageEvent("message", { data: event.data }));
    });

    // Acquire a Web Lock named after the clientId. This lets other contexts
    // track this context's lifetime.
    // TODO: It would be better to lock on the clientId+serviceName (passing
    // that lock name in the service request). That would allow independent
    // instance lifetime tracking.
    await SharedService.#acquireContextLock(clientId);

    return clientId;
  }

  async #providerChange() {
    // Multiple calls to this function could be in flight at once. If that
    // happens, we only care about the most recent call, i.e. the one
    // assigned to this.#providerPort. This counter lets us determine
    // whether this call is still the most recent.
    const providerCounter = ++this.#providerCounter;

    // Obtain a MessagePort from the provider. The request can fail during
    // a provider transition, so retry until successful.
    let providerPort: MessagePort | null = null;
    const clientId = await this.#clientId;
    while (!providerPort && providerCounter === this.#providerCounter) {
      // Broadcast a request for the port.
      const nonce = randomString();
      this.#clientChannel.postMessage({
        type: "request",
        nonce,
        sharedService: this.#serviceName,
        clientId,
      });

      // Wait for the provider to respond (via the service worker) or
      // timeout. A timeout can occur if there is no provider to receive
      // the broadcast or if the provider is too busy.
      const providerPortReady = new Promise<MessagePort>((resolve) => {
        const abortController = new AbortController();
        this.addEventListener(
          "message",
          (event) => {
            if (event.data?.nonce === nonce) {
              resolve(event.data.ports[0]);
              abortController.abort();
            }
          },
          { signal: abortController.signal },
        );
        this.#providerChangeCleanup.push(() => abortController.abort());
      });

      providerPort = await Promise.race<MessagePort | null>([
        providerPortReady,
        new Promise((resolve) => setTimeout(() => resolve(null), PROVIDER_REQUEST_TIMEOUT)),
      ]);

      if (!providerPort) {
        // The provider request timed out. If it does eventually arrive
        // just close it.
        providerPortReady.then((port) => port?.close());
      }
    }

    if (providerPort && providerCounter === this.#providerCounter) {
      // Clean up all earlier attempts to get the provider port.
      this.#providerChangeCleanup.forEach((f) => f());
      this.#providerChangeCleanup = [];

      // Configure the port.
      providerPort.addEventListener("message", ({ data }) => {
        const callbacks = this.providerCallbacks.get(data.nonce);
        if (!data.error) {
          callbacks?.resolve(data.result);
        } else {
          callbacks?.reject(Object.assign(new Error(), data.error));
        }
      });
      providerPort.start();
      return providerPort;
    } else {
      // Either there is no port because this request timed out, or there
      // is a port but it is already obsolete because a new provider has
      // announced itself.
      providerPort?.close();
      return null;
    }
  }

  #closeProviderPort(providerPort) {
    providerPort.then((port) => port?.close());
    for (const { reject } of this.providerCallbacks.values()) {
      reject(new Error("SharedService provider change"));
    }
  }

  #createProxy() {
    // return new Proxy({} as DataServiceProxy<T>, {
    return new Proxy<T>({} as T, {
      get: (_, method) => {
        return async (...args) => {
          // Use a nonce to match up requests and responses. This allows
          // the responses to be out of order.
          const nonce = randomString();

          const providerPort = await this.#providerPort;
          return new Promise((resolve, reject) => {
            this.providerCallbacks.set(nonce, { resolve, reject });
            providerPort?.postMessage({ nonce, method, args });
          }).finally(() => {
            this.providerCallbacks.delete(nonce);
          });
        };
      },
    });
  }

  static #acquireContextLock = (function () {
    let p;
    return function (clientId: string) {
      return p
        ? p
        : (p = new Promise<void>((resolve) => {
            navigator.locks.request(
              clientId,
              () =>
                new Promise((_) => {
                  resolve();
                }),
            );
          }));
    };
  })();
}

/**
 * Wrap a target with MessagePort for proxying.
 */
export function createSharedServicePort(target: DataService<any>) {
  const { port1: providerPort1, port2: providerPort2 } = new MessageChannel();
  providerPort1.addEventListener("message", ({ data: clientId }) => {
    const { port1, port2 } = new MessageChannel();

    // The port requester holds a lock while using the channel. When the
    // lock is released by the requester, clean up the port on this side.
    navigator.locks.request(clientId, () => {
      port1.close();
    });

    port1.addEventListener("message", async ({ data }) => {
      const response: ProxyMessage = { nonce: data.nonce };
      try {
        response.result = await target.proxy[data.method](...data.args);
      } catch (e) {
        // Error is not structured cloneable so copy into POJO.
        const error =
          e instanceof Error ? Object.fromEntries(Object.getOwnPropertyNames(e).map((k) => [k, (e as Error)[k]])) : e;
        response.error = error;
      }
      port1.postMessage(response);
    });
    port1.start();
    providerPort1.postMessage(null, [port2]);
  });
  providerPort1.start();
  console.log("Port service started", target);
  return providerPort2;
}

function randomString() {
  return Math.random().toString(36).replace("0.", "");
}
