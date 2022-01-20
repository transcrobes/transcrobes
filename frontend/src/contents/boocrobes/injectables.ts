// import { Injectable } from "@d-i-t-a/reader/dist/types/navigator/IFrameNavigator";

// eslint-disable-next-line no-var
declare var __webpack_hash__: any;

// const injectables: Injectable[] = [
const injectables: any[] = [
  {
    type: "style",
    url: `${origin}/ReadiumCSS-before.css`,
    r2before: true,
  },
  {
    type: "style",
    url: `${origin}/ReadiumCSS-default.css`,
    r2default: true,
  },
  {
    type: "style",
    url: `${origin}/ReadiumCSS-after.css`,
    r2after: true,
  },
  {
    // transcrobes
    type: "script",
    // the hash is required or Android basically never updates...
    url: `${origin}/readium.${__webpack_hash__}.js`,
    r2before: true,
  },
  {
    type: "style",
    url: `${origin}/opendyslexic.css`,
    fontFamily: "opendyslexic",
  },
];
// const augmentedInjectables: Injectable[] = injectables;
const augmentedInjectables: any[] = injectables;
for (const fontFamily of ["serif", "sans-serif", "opendyslexic", "monospace"]) {
  for (const fontFamilyChinese of ["notasanslight", "notaserifextralight", "notaserifregular", "mashanzheng"]) {
    augmentedInjectables.push({
      type: "style",
      url: `${origin}/chinese.css`,
      fontFamily: `${fontFamily},${fontFamilyChinese}`,
    });
  }
}

export default augmentedInjectables;
