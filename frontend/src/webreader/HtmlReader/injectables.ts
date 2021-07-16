const origin = window.location.origin;
//FIXME: check whether origin is necessary at all

const injectables = [
  {
    type: "style",
    // url: `${origin}/readium-css/ReadiumCSS-before.css`,
    url: `${origin}/ReadiumCSS-before.css`,
    r2before: true,
  },
  {
    type: "style",
    // url: `${origin}/readium-css/ReadiumCSS-default.css`,
    url: `${origin}/ReadiumCSS-default.css`,
    r2default: true,
  },
  {
    type: "style",
    // url: `${origin}/readium-css/ReadiumCSS-after.css`,
    url: `${origin}/ReadiumCSS-after.css`,
    r2after: true,
  },
  {
    // transcrobes
    type: "script",
    url: `${origin}/readium-bundle.js`,
    r2before: true,
  },
  {
    type: "style",
    // url: `${origin}/fonts/opendyslexic/opendyslexic.css`,
    url: `${origin}/opendyslexic.css`,
    fontFamily: "opendyslexic",
  },
];

export default injectables;
