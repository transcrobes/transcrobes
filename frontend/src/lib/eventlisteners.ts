declare global {
  interface TextTrack {
    _addEventListener<K extends keyof ElementEventMap>(
      type: K,
      listener: (this: Element, ev: ElementEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions,
    ): void;
    _addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void;
    _removeEventListener<K extends keyof ElementEventMap>(
      type: K,
      listener: (this: Element, ev: ElementEventMap[K]) => any,
      options?: boolean | EventListenerOptions,
    ): void;
    _removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ): void;
    eventListenerList: Record<string, any[]>;
    getEventListeners: <K extends "cuechange">(type?: K) => any[] | Record<string, any[]>;
    clearEventListeners: <K extends "cuechange">(a: K) => void;
  }
}
export function overrideTextTrackListeners(): void {
  // very much inspired by MIT-licenced https://github.com/colxi/getEventListeners, but
  // made to run in TS (badly!) and made specific to TextTracks

  // save the original methods before overwriting them
  TextTrack.prototype._addEventListener = TextTrack.prototype.addEventListener;
  TextTrack.prototype._removeEventListener = TextTrack.prototype.removeEventListener;

  /**
   * [addEventListener description]
   * @param {[type]}  type       [description]
   * @param {[type]}  listener   [description]
   * @param {Boolean} useCapture [description]
   */
  TextTrack.prototype.addEventListener = function <K extends "cuechange">(
    type: K,
    listener: (this: TextTrack, ev: TextTrackEventMap[K]) => any,
    useCapture = false,
  ) {
    // declare listener
    this._addEventListener(type, listener, useCapture);

    if (!this.eventListenerList) this.eventListenerList = {};
    if (!this.eventListenerList[type]) this.eventListenerList[type] = [];

    // add listener to  event tracking list
    this.eventListenerList[type].push({ type, listener, useCapture });
  };

  /**
   * [removeEventListener description]
   * @param  {[type]}  type       [description]
   * @param  {[type]}  listener   [description]
   * @param  {Boolean} useCapture [description]
   * @return {[type]}             [description]
   */
  TextTrack.prototype.removeEventListener = function <K extends "cuechange">(
    type: K,
    listener: (this: TextTrack, ev: TextTrackEventMap[K]) => any,
    useCapture = false,
  ) {
    // remove listener
    this._removeEventListener(type, listener, useCapture);

    if (!this.eventListenerList) this.eventListenerList = {};
    if (!this.eventListenerList[type]) this.eventListenerList[type] = [];

    // Find the event in the list, If a listener is registered twice, one
    // with capture and one without, remove each one separately. Removal of
    // a capturing listener does not affect a non-capturing version of the
    // same listener, and vice versa.
    for (let i = 0; i < this.eventListenerList[type].length; i++) {
      if (
        this.eventListenerList[type][i].listener === listener &&
        this.eventListenerList[type][i].useCapture === useCapture
      ) {
        this.eventListenerList[type].splice(i, 1);
        break;
      }
    }
    // if no more events of the removed event type are left,remove the group
    if (this.eventListenerList[type].length == 0) delete this.eventListenerList[type];
  };

  /**
   * [getEventListeners description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  TextTrack.prototype.getEventListeners = function <K extends "cuechange">(type?: K) {
    if (!this.eventListenerList) this.eventListenerList = {};

    // return reqested listeners type or all them
    if (type === undefined) return this.eventListenerList;
    return this.eventListenerList[type];
  };

  TextTrack.prototype.clearEventListeners = function <K extends "cuechange">(a: K) {
    if (!this.eventListenerList) this.eventListenerList = {};
    if (a == undefined) {
      for (const x in this.getEventListeners()) {
        this.clearEventListeners(x as K);
      }
      return;
    }
    const el = this.getEventListeners(a) as any[];
    if (el == undefined) return;
    for (let i = el.length - 1; i >= 0; --i) {
      const ev = el[i];
      this.removeEventListener(a, ev.listener, ev.useCapture);
    }
  };
}
