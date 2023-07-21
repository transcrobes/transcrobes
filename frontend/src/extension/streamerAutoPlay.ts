import { getStreamerId } from "../lib/libMethods";

async function checkForStreamer(url: string) {
  if (getStreamerId(url)) {
    console.log("Checking for auto play", getStreamerId(url));
    await chrome.runtime.sendMessage({
      type: "streamerAutoPlayUrl",
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
