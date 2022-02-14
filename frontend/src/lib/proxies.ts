import { Workbox } from "workbox-window";
import { isInitialisedAsync, setInitialisedAsync } from "../database/authdb";
import type { EventData, ExtendedEventData } from "./types";

type ConfigType = {
  resourceRoot?: string;
  username?: string;
};

type ProgressCallbackMessage = {
  isFinished: boolean;
  message: string;
};

abstract class AbstractWorkerProxy {
  abstract init(
    config: ConfigType,
    callback: (x: any) => string,
    progressCallback: (x: ProgressCallbackMessage) => string,
    allowInstall?: boolean,
  ): void;

  abstract asyncInit(
    config: ConfigType,
    progressCallback?: (x: ProgressCallbackMessage) => string,
    allowInstall?: boolean,
  ): Promise<void>;

  abstract sendMessage(
    message: EventData,
    callback?: (x: any) => string,
    progressCallback?: (x: ProgressCallbackMessage) => string,
  ): void;
  abstract getURL(relativePath: string): string;

  abstract sendMessagePromise<Type>(eventData: EventData): Promise<Type>;
  abstract get loaded(): boolean;
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

  get loaded() {
    return this.#loaded;
  }

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

  async sendMessagePromise<Type>(eventData: ExtendedEventData, allowInstall = false): Promise<Type> {
    // FIXME: absolutely need to rationalise the messageSW vs chrome.sendMessage...
    if (
      !this.#config.username ||
      (!(await isInitialisedAsync(this.#config.username)) && eventData.type !== "heartbeat" && !allowInstall)
    ) {
      console.error(
        "Uninitialised looking for",
        eventData,
        this.#config.username,
        this.#config.username ? await isInitialisedAsync(this.#config.username) : null,
      );
      throw new Error("Unable to init outside the initialiser");
    }
    const message = await this.wb.messageSW(eventData);
    return message.value;
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
    });
  }

  sendMessage(
    message: EventData,
    callback: (x: any) => string,
    progressCallback?: (x: ProgressCallbackMessage) => string,
    allowInstall = false,
  ): void {
    if (message.type === "heartbeat") {
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

    if (!this.#config.username) {
      throw new Error("Missing username in the proxy");
    }

    isInitialisedAsync(this.#config.username).then((inited) => {
      if (!allowInstall && !inited) {
        throw new Error("Unable to init outside the initialiser");
      } else {
        this.postMessage({
          message: message,
          callback: callback,
          progressCallback: progressCallback,
        });
      }
    });
  }

  async asyncInit(
    config: ConfigType,
    progressCallback?: (x: ProgressCallbackMessage) => string,
    allowInstall = false,
  ): Promise<void> {
    this.#config = config;
    if (!this.#config.username) {
      throw new Error("Attempt to init without a username");
    }
    const message = {
      source: this.DATA_SOURCE,
      type: "syncDB",
      value: this.#config,
      progress: progressCallback,
    };
    await this.sendMessagePromise(message, allowInstall);
    this.#loaded = true;
  }

  init(
    config: ConfigType,
    callback: (x: any) => string,
    progressCallback: (x: ProgressCallbackMessage) => string,
    allowInstall = false,
  ): void {
    this.#config = config;

    if (!this.#config.username) {
      throw new Error("Attempt to init without a username");
    }

    isInitialisedAsync(this.#config.username).then((inited) => {
      if (!allowInstall && !inited) {
        console.log("I don't have a user in sw proxy");
        window.location.href = "/#/init";
        return;
      }
      const message = { source: this.DATA_SOURCE, type: "syncDB", value: {} }; // appConfig gets added in postMessage
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
          if (progress.message === "RESTART_BROWSER") {
            throw new Error("Browser restart required");
          }

          // Or should I be in the normal callback?
          if (this.#config.username && progress.isFinished) {
            setInitialisedAsync(this.#config.username);
          }

          return progressCallback(progress);
        },
        allowInstall,
      );
    });
  }
}

class BackgroundWorkerProxy extends AbstractWorkerProxy {
  DATA_SOURCE = "BackgroundWorkerProxy";

  getURL = chrome.runtime.getURL;
  #callbacks = new Map<string, (x: any) => string>();
  #messageQueue: MessageWithCallbacks[] = [];
  #config: ConfigType = {};

  #loaded = false;
  get loaded() {
    return this.#loaded;
  }

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
      if (mwc.callback && returnMessage) {
        return mwc.callback(returnMessage.value);
      } else if (mwc.callback && !returnMessage) {
        // FIXME: should probably throw an error here...
        console.warn(
          "No return message found for callback, is the method implemented in the service worker?",
          mwc.callback.name,
        );
      }
    });
  }

  sendMessagePromise<Type>(eventData: ExtendedEventData, allowInstall = false): Promise<Type> {
    return new Promise((resolve, _reject) => {
      this.sendMessage(
        eventData,
        (value) => {
          resolve(value);
          return "";
        },
        eventData.progress,
        allowInstall,
      );
    });
  }

  sendMessage(
    message: EventData,
    callback?: (x: any) => string,
    progressCallback?: (x: ProgressCallbackMessage) => string,
    allowInstall = false,
  ): void {
    if (message.type === "heartbeat") {
      this.postMessage({
        message: message,
        callback: callback,
        progressCallback: progressCallback,
      });
      return;
    } else if (message.type === "getUser") {
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

    if (!this.#config.username) {
      throw new Error("Missing username in the proxy");
    }

    this.postMessage({
      message: message,
      callback: callback,
      progressCallback: progressCallback,
    });

    // FIXME: should we check this somehow?
    // isInitialisedAsync(this.#config.username).then((inited) => {
    //   if (!allowInstall && !inited) {
    //     console.log("this.#config", this.#config, allowInstall, inited, message);
    //     throw new Error("Unable to init outside the initialiser");
    //   }
    //   this.postMessage({
    //     message: message,
    //     callback: callback,
    //     progressCallback: progressCallback,
    //   });
    // });
  }

  async asyncInit(
    config: ConfigType,
    progressCallback?: (x: ProgressCallbackMessage) => string,
    allowInstall = false,
  ): Promise<void> {
    this.#config = config;
    if (!this.#config.username) {
      throw new Error("Attempt to init without a username");
    }
    const message = {
      source: this.DATA_SOURCE,
      type: "syncDB",
      value: this.#config,
      progress: progressCallback,
    };
    await this.sendMessagePromise(message, allowInstall);
    this.#loaded = true;
  }

  init(
    config: ConfigType,
    callback: (x: any) => string,
    progressCallback: (x: ProgressCallbackMessage) => string,
    allowInstall = false,
  ): void {
    this.#config = config;

    if (!this.#config.username) {
      throw new Error("Attempt to init without a username");
    }

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
      allowInstall,
    );

    // FIXME: should we check this somehow?
    // isInitialisedAsync(this.#config.username).then((inited) => {
    //   if (!allowInstall && !inited) {
    //     throw new Error("Unable to init outside the initialiser");
    //   }

    //   const message = { source: this.DATA_SOURCE, type: "syncDB", value: this.#config };
    //   this.sendMessage(
    //     message,
    //     (response) => {
    //       this.#loaded = true;
    //       while (this.#messageQueue.length > 0) {
    //         const mess = this.#messageQueue.shift();
    //         if (mess) this.postMessage(mess);
    //       }
    //       return callback(response);
    //     },
    //     (progress) => {
    //       return progressCallback(progress);
    //     },
    //     allowInstall,
    //   );
    // });
  }
}

export let platformHelper: AbstractWorkerProxy;
export function setPlatformHelper(value: AbstractWorkerProxy): void {
  platformHelper = value;
}

export { ServiceWorkerProxy, BackgroundWorkerProxy, AbstractWorkerProxy };
export type { ProgressCallbackMessage };
