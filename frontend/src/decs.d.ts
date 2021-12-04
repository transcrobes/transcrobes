declare module "html-parsed-element";
declare module "*.png" {
  const value: string;
  export default value;
}
declare module "*.gif" {
  const value: string;
  export default value;
}

declare namespace JSX {
  interface IntrinsicElements {
    "enriched-text-fragment": any;
  }
}
