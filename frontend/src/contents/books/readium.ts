import * as components from "../../lib/components";
export * from "../../lib/components";

function loadSettingsFromParentFrame() {
  console.debug("Loading injectables");
  components.setPlatformHelper(window.parent.componentsConfig.proxy);
  components.setEventSource("readium.ts");
  components.setBaseUrl(window.parent.componentsConfig.url.origin);
  components.setLangPair(window.parent.componentsConfig.langPair);
  components.setSegmentation(window.parent.readerConfig.segmentation);
  components.setGlossing(window.parent.readerConfig.glossing);
  components.setPopupParent(window.parent.readerConfig.popupParent);
}

loadSettingsFromParentFrame();

function showHideMenus(event: MouseEvent) {
  if (!components.destroyPopup(event, document, window.parent.document)) {
    // FIXME: temporarily turned off while integrating new web-reader
    // if (window.parent.document.querySelector("#headerMenu").classList.contains("hidden")) {
    //   window.parent.document.querySelector("#headerMenu").classList.remove("hidden");
    //   window.parent.document.querySelector("iframe").height = window.parent.iframeHeight;
    // } else {
    //   window.parent.document.querySelector("#headerMenu").classList.add("hidden");
    //   window.parent.document.querySelector("iframe").height = window.parent.innerHeight - 20 + "px";
    // }
    // window.parent.document.querySelector("#container-view-timeline").classList.toggle("hidden");
    // window.parent.document.querySelector("#reader-info-bottom-wrapper").classList.toggle("hidden");
  } else {
    event.stopPropagation(); // we don't want other events, but we DO want the default, for clicking on links
  }
}
document.addEventListener("click", (event: MouseEvent) => {
  showHideMenus(event);
});

// TODO: this also applies on the menus, whereas we just want on the "empty" space under the iframe
// window.parent.document.addEventListener('click', (event) => {
//   showHideMenus(event)
// });

components.getUserCardWords().then(() => {
  components.defineElements();
  console.debug("Finished setting up elements for readium");
});
