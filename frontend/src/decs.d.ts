declare module "html-parsed-element";

declare namespace JSX {
  interface IntrinsicElements {
    "enriched-text-fragment": any;
  }
}

// FIXME: the import of these doesn't work for some reason
declare module "*.otf";
declare module "*.ttf";
