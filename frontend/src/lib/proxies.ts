import { Workbox } from "workbox-window";
import { EventData } from "./types";
import { isInitialised, setInitialised } from "./JWTAuthProvider";

type ConfigType = {
  resourceRoot?: string;
};

type ProgressCallbackMessage = {
  isFinished: boolean;
  message: string;
};

abstract class AbstractWorkerProxy {
  abstract sendMessage(
    message: EventData,
    callback?: (x: any) => string,
    progressCallback?: (x: ProgressCallbackMessage) => string,
  ): void;
  abstract getURL(relativePath: string): string;

  abstract sendMessagePromise<Type>(eventData: EventData): Promise<Type>;
}

type MessageWithCallbacks = {
  message: EventData;
  callback?: (x: any) => string;
  progressCallback?: (x: ProgressCallbackMessage) => string;
};

class ServiceWorkerProxy extends AbstractWorkerProxy {
  DATA_SOURCE = "ServiceWorkerProxy";
  wb: Workbox;

  #callbacks = new Map<string, (x: any) => string>();
  #messageQueue: MessageWithCallbacks[] = [];
  #config: ConfigType = {};

  #loaded = false;

  constructor(wb: Workbox) {
    super();
    navigator.serviceWorker.addEventListener("message", (event: MessageEvent<any>) => {
      const message = event.data;
      const identifier = `${message.source}-${message.type}`;
      if (this.#callbacks.has(identifier)) {
        const cb = this.#callbacks.get(identifier);
        if (cb) {
          cb(message.value);
        }
      }
    });
    this.wb = wb;
    this.init = this.init.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.postMessage = this.postMessage.bind(this);
    this.getURL = this.getURL.bind(this);
  }

  async sendMessagePromise<Type>(eventData: EventData): Promise<Type> {
    const message = await this.wb.messageSW(eventData);
    return message.value;

    // return new Promise((resolve, _reject) => {
    //   this.sendMessage(eventData, (value) => {
    //     resolve(value);
    //     return "";
    //   });
    // });
  }

  getURL(relativePath: string): string {
    const resourceRoot = this.#config.resourceRoot ? this.#config.resourceRoot : "";
    return resourceRoot.replace(/\/*$/, "") + "/" + relativePath.replace(/^\/*/, "");
  }

  // FIXME: here should really properly type the return value
  postMessage(mwc: MessageWithCallbacks) {
    const identifier = `${mwc.message.source}-${mwc.message.type}`;

    if (mwc.callback) this.#callbacks.set(identifier, mwc.callback);
    if (mwc.progressCallback) {
      this.#callbacks.set(identifier + "-progress", mwc.progressCallback);
    }
    return navigator.serviceWorker.ready.then((registration: ServiceWorkerRegistration) => {
      if (!registration.active) {
        console.error("There is a problem with mwc", mwc);
      }
      if (registration.active) registration.active.postMessage(mwc.message);
      // return mwc.message;
    });
  }

  sendMessage(
    message: EventData,
    callback: (x: any) => string,
    progressCallback?: (x: ProgressCallbackMessage) => string,
  ): void {
    if (message.type === "isDbInitialised") {
      isInitialised().then((value) => {
        callback(value);
      });
      return;
    } else if (message.type === "heartbeat") {
      this.postMessage({
        message: message,
        callback: callback,
        progressCallback: progressCallback,
      });
      return;
    } else if (!this.#loaded && `${this.DATA_SOURCE}-${"syncDB"}` in this.#callbacks) {
      // we are not yet initialised, queue the messages rather than actually send them
      this.#messageQueue.push({
        message: message,
        callback: callback,
        progressCallback: progressCallback,
      });
      return;
    } // else if !this.#initialised then throw error ???

    this.postMessage({ message: message, callback: callback, progressCallback: progressCallback });
  }

  init(
    config: ConfigType,
    callback: (x: any) => string,
    progressCallback: (x: ProgressCallbackMessage) => string,
  ): void {
    console.debug("Setting up ServiceWorkerProxy.init with config", config);
    this.#config = config;

    const message = { source: this.DATA_SOURCE, type: "syncDB", value: {} }; // appConfig gets added in postMessage
    this.sendMessage(
      message,
      (response) => {
        console.debug(
          `Got a response for message in ServiceWorkerProxy init returning to caller`,
          message,
          response,
        );
        this.#loaded = true;
        while (this.#messageQueue.length > 0) {
          const mess = this.#messageQueue.shift();
          if (mess) this.postMessage(mess);
        }
        return callback(response);
      },
      (progress) => {
        // Or should I be in the normal callback?
        if (progress.isFinished) {
          setInitialised();
        }
        return progressCallback(progress);
      },
    );
  }
}

class BackgroundWorkerProxy extends AbstractWorkerProxy {
  DATA_SOURCE = "BackgroundWorkerProxy";

  getURL = chrome.runtime.getURL;
  #callbacks = new Map<string, (x: any) => string>();
  #messageQueue: MessageWithCallbacks[] = [];
  #config: ConfigType = {};

  #loaded = false;

  constructor() {
    super();
    this.init = this.init.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.postMessage = this.postMessage.bind(this);
  }

  postMessage(mwc: MessageWithCallbacks) {
    const identifier = `${mwc.message.source}-${mwc.message.type}`;

    if (mwc.callback) this.#callbacks.set(identifier, mwc.callback);
    if (mwc.progressCallback) {
      this.#callbacks.set(identifier + "-progress", mwc.progressCallback);
    }

    chrome.runtime.sendMessage(mwc.message, (returnMessage) => {
      if (mwc.callback) return mwc.callback(returnMessage.value);
    });
  }

  sendMessagePromise<Type>(eventData: EventData): Promise<Type> {
    return new Promise((resolve, _reject) => {
      this.sendMessage(eventData, (value) => {
        resolve(value);
        return "";
      });
    });
  }

  sendMessage(
    message: EventData,
    callback?: (x: any) => string,
    progressCallback?: (x: ProgressCallbackMessage) => string,
  ): void {
    if (message.type === "isDbInitialised") {
      isInitialised().then((value) => {
        if (callback) callback(value);
      });
      return;
    } else if (message.type === "heartbeat") {
      this.postMessage({
        message: message,
        callback: callback,
        progressCallback: progressCallback,
      });
      return;
    } else if (!this.#loaded && `${this.DATA_SOURCE}-${"syncDB"}` in this.#callbacks) {
      // we are not yet initialised, queue the messages rather than actually send them
      this.#messageQueue.push({
        message: message,
        callback: callback,
        progressCallback: progressCallback,
      });
      return;
    } // else if !this.#initialised then throw error ???

    this.postMessage({ message: message, callback: callback, progressCallback: progressCallback });
  }

  init(
    config: ConfigType,
    callback: (x: any) => string,
    progressCallback: (x: ProgressCallbackMessage) => string,
  ): void {
    this.#config = config;

    const message = { source: this.DATA_SOURCE, type: "syncDB", value: this.#config };
    this.sendMessage(
      message,
      (response) => {
        this.#loaded = true;
        while (this.#messageQueue.length > 0) {
          const mess = this.#messageQueue.shift();
          if (mess) this.postMessage(mess);
        }
        return callback(response);
      },
      (progress) => {
        return progressCallback(progress);
      },
    );
  }
}

export { ServiceWorkerProxy, BackgroundWorkerProxy, AbstractWorkerProxy };
export type { ProgressCallbackMessage };
