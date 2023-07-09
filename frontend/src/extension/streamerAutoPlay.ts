import { getStreamerId } from "../lib/libMethods";
import { BackgroundWorkerProxy } from "../lib/proxies";

const proxy = new BackgroundWorkerProxy();

async function checkForStreamer(url: string) {
  if (getStreamerId(url)) {
    console.log("Checking for auto play", getStreamerId(url));
    await proxy.sendMessagePromise({
      source: "streamerAutoPlay",
      type: "streamerAutoPlay",
      value: url,
    });
  }
}
let currentUrl = "";
setInterval(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    checkForStreamer(currentUrl);
  }
}, 500);
