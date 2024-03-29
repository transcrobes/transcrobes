// import { Injectable } from "@d-i-t-a/reader/dist/types/navigator/IFrameNavigator";

declare var __FAKE_HASH__: any;

// const injectables: Injectable[] = [
const injectables: any[] = [
  {
    type: "style",
    url: `${origin}/static/ReadiumCSS-before.css`,
    r2before: true,
  },
  {
    type: "style",
    url: `${origin}/static/ReadiumCSS-default.css`,
    r2default: true,
  },
  {
    type: "style",
    url: `${origin}/static/ReadiumCSS-after.css`,
    r2after: true,
  },
  {
    // transcrobes
    // type: "script",
    type: "module",
    // the hash is required or Android basically never updates...
    url: import.meta.env.DEV
      ? `${origin}/src/contents/boocrobes/readium.tsx`
      : `${origin}/readium.` + __FAKE_HASH__ + `.js`,
    r2before: true,
  },
  {
    type: "style",
    url: `${origin}/static/opendyslexic.css`,
    fontFamily: "opendyslexic",
  },
];
// const augmentedInjectables: Injectable[] = injectables;
const augmentedInjectables: any[] = injectables;
for (const fontFamily of ["serif", "sans-serif", "opendyslexic", "monospace"]) {
  for (const fontFamilyChinese of ["notasanslight", "notaserifextralight", "notaserifregular", "mashanzheng"]) {
    augmentedInjectables.push({
      type: "style",
      url: `${origin}/static/chinese.css`,
      fontFamily: `${fontFamily},${fontFamilyChinese}`,
    });
  }
}

export default augmentedInjectables;
