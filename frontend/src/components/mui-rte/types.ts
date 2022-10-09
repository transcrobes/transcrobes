// stolen from @mui/styles/withStyles/withStyles.d.ts

import * as CSS from "csstype";

// private JSS type that should be public
type JSSNormalCssProperties = CSS.Properties<number | string>;
type JSSFontface = CSS.AtRule.FontFace & { fallbacks?: CSS.AtRule.FontFace[] };

export type PropsFunc<Props extends object, T> = (props: Props) => T;

/**
 * Allows the user to augment the properties available
 */
export interface BaseCSSProperties extends JSSNormalCssProperties {
  "@font-face"?: JSSFontface | JSSFontface[];
}

export interface CSSProperties extends BaseCSSProperties {
  // Allow pseudo selectors and media queries
  // `unknown` is used since TS does not allow assigning an interface without
  // an index signature to one with an index signature. This is to allow type safe
  // module augmentation.
  // Technically we want any key not typed in `BaseCSSProperties` to be of type
  // `CSSProperties` but this doesn't work. The index signature needs to cover
  // BaseCSSProperties as well. Usually you would use `BaseCSSProperties[keyof BaseCSSProperties]`
  // but this would not allow assigning React.CSSProperties to CSSProperties
  [k: string]: unknown | CSSProperties;
}

export type BaseCreateCSSProperties<Props extends object = {}> = {
  [P in keyof BaseCSSProperties]:
    | BaseCSSProperties[P]
    | PropsFunc<Props, BaseCSSProperties[P]>;
};

export interface CreateCSSProperties<Props extends object = {}>
  extends BaseCreateCSSProperties<Props> {
  // Allow pseudo selectors and media queries
  [k: string]:
    | BaseCreateCSSProperties<Props>[keyof BaseCreateCSSProperties<Props>]
    | CreateCSSProperties<Props>;
}
