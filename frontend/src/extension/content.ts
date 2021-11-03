import * as components from "../lib/components";
import { BackgroundWorkerProxy } from "../lib/proxies";
import TranscrobesCSS from "../css/tccss";
import { ModelType } from "../lib/types";
import { textNodes } from "../lib/funclib";

const DATA_SOURCE = "content.ts";

declare global {
  interface Window {
    transcrobesModel: { [key: string]: ModelType };
  }
}

window.transcrobesModel = {};
const transcroberObserver: IntersectionObserver = new IntersectionObserver(onEntryId, {
  threshold: [0.9],
});

// let readObserver = new IntersectionObserver(components.onScreen, {
//   threshold: [1.0],
//   // FIXME: decide whether it is worth trying to use V2 of the IntersectionObserver API
//   // Track the actual visibility of the element
//   // trackVisibility: true,
//   // Set a minimum delay between notifications
//   // delay: 1000,  //at 1sec, we are conservative and shouldn't cause huge load
// });

// the callback function that will be fired when the element apears in the viewport

const platformHelper = new BackgroundWorkerProxy();

function onEntryId(entries: IntersectionObserverEntry[]) {
  entries.forEach((change) => {
    const element = change.target as HTMLElement;
    if (!change.isIntersecting) return;
    if (element.dataset && element.dataset.tced) return;
    change.target.childNodes.forEach((item) => {
      if (
        item.nodeType === 3 &&
        item.nodeValue?.trim() &&
        components.toEnrich(item.nodeValue, "zh-Hans")
      ) {
        console.debug("Trying to transcrobe", item.nodeValue);
        platformHelper.sendMessage(
          { source: DATA_SOURCE, type: "enrichText", value: item.nodeValue },
          ([data, text]: [ModelType, string]) => {
            const etf = document.createElement("enriched-text-fragment");
            // FIXME: this appears not to be usable on the other side in chrome extensions
            // etf.setAttribute('data-model', JSON.stringify(data));
            window.transcrobesModel[data["id"].toString()] = data;
            etf.setAttribute("id", data["id"].toString());
            // FIXME: this appears not to be usable on the other side in chrome extensions so not setting here
            etf.appendChild(document.createTextNode(text));
            item.replaceWith(etf);
            (element.dataset as any).tced = true;
            return "";
          },
        );
      }
    });
  });
}

function enrichDocument() {
  textNodes(document.body).forEach((textNode) => {
    if (textNode.nodeValue && textNode.parentElement) {
      // FIXME: get this properly from the user!!!???
      if (!components.toEnrich(textNode.nodeValue, "zh-Hans")) {
        console.log("Not enriching: " + textNode.nodeValue);
        return;
      }
      transcroberObserver.observe(textNode.parentElement);
    }
  });

  document.addEventListener("click", () => {
    document.querySelectorAll("token-details").forEach((el) => el.remove());
  });
}

components.setPlatformHelper(platformHelper);
components.defineElements();

const rtStyle = document.createElement("style");
rtStyle.textContent = TranscrobesCSS;
document.body.appendChild(rtStyle);

const spinnerDiv = document.createElement("div");
spinnerDiv.id = "tcSpinnerLoading";
spinnerDiv.innerHTML = "Loading...";
spinnerDiv.classList.add("loader");
spinnerDiv.classList.add("centre-loader");
document.body.appendChild(spinnerDiv);

function ensureLoaded(qtype: string) {
  return platformHelper.sendMessagePromise<string>({ source: DATA_SOURCE, type: qtype, value: "" });
}

async function ensureAllLoaded() {
  components.setLangPair(await ensureLoaded("langPair"));
  components.setGlossing(parseInt(await ensureLoaded("glossing")));
  await ensureLoaded("getCardWords");
}

platformHelper
  .sendMessagePromise<string>({ source: DATA_SOURCE, type: "getUsername", value: "" })
  .then((username) => {
    if (!username) {
      alert("No username set. Please configure and initialise in the extension options.");
      throw new Error("Unable to find the current username");
    }
    const conf = { username: username };
    platformHelper.init(
      conf,
      () => {
        ensureAllLoaded().then(() => {
          spinnerDiv.classList.add("hidden");
          enrichDocument();
        });
        return "";
      },
      () => {
        return "";
      },
    );

    // This ensures that when the transcrobed tab has focus, the background script will
    // be active or reactivated if unloaded (which happens regularly)
    setInterval(
      () =>
        platformHelper.sendMessage(
          { source: DATA_SOURCE, type: "getWordFromDBs", value: "的" },
          (date) => {
            console.debug("Heartbeat", date);
            return "";
          },
        ),
      5000,
    );
  });
