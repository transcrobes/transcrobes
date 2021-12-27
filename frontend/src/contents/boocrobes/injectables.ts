import { Injectable } from "@d-i-t-a/reader/dist/types/navigator/IFrameNavigator";
// eslint-disable-next-line no-var
declare var __webpack_hash__: any;

const origin = window.location.origin;
//FIXME: check whether origin is necessary at all

const injectables: Injectable[] = [
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

export default injectables;
