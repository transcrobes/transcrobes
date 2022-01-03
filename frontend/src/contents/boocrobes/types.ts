// import { Injectable } from "@d-i-t-a/reader/dist/types/navigator/IFrameNavigator";
import { USER_STATS_MODE_KEY_VALUES } from "../../lib/lib";
import { ThemeName } from "../../lib/types";
import { WebpubManifest } from "./WebpubManifestTypes/WebpubManifest";
import { PRECACHE_PUBLICATIONS } from "./constants";

export type { WebpubManifest };

// the MimeType for a packaged epub
export const EpubMimeType = "application/epub";
// the Mimetype for a generic webpub
export const WebpubMimeType = "application/webpub";

export const DEFAULT_FONT_SIZE = 108;
export const DEFAULT_FONT_FAMILY = "Original";
export const DEFAULT_FONT_FAMILY_CHINESE = "notasanslight";

export type ColorMode = ThemeName | "sepia";
export type D2ColorMode = "readium-default-on" | "readium-night-on" | "readium-sepia-on";

export type FontFamily = "Original" | "serif" | "sans-serif" | "opendyslexic" | "monospace";

export type FontFamilyChinese =
  | "notasanslight"
  | "notaserifextralight"
  | "notaserifregular"
  | "mashanzheng";

export type Navigator = {
  goForward: () => void;
  goBackward: () => void;
  setScroll: (val: boolean) => Promise<void>;
  goToPage: (href: string) => void;
};

export type PdfNavigator = Navigator & {
  zoomIn: () => Promise<void>;
  zoomOut: () => Promise<void>;
};

export type HtmlNavigator = Navigator & {
  increaseFontSize: () => Promise<void>;
  decreaseFontSize: () => Promise<void>;
  setFontFamily: (family: FontFamily) => Promise<void>;
  setFontFamilyChinese: (family: FontFamilyChinese) => Promise<void>;
  setGlossing: (glossing: USER_STATS_MODE_KEY_VALUES) => void;
  setSegmentation: (segmentation: boolean) => void;
  setMouseover: (mouseover: boolean) => void;
};

// Optional settings to initialize the reader with
export type ReaderSettings = HtmlReaderState & {
  location?: undefined | any;
};

export type ReaderState = {
  isScrolling: boolean;
  fontSize: number;
  fontFamily: FontFamily;
  fontFamilyChinese: FontFamilyChinese;
  currentTocUrl: string | null;
  atStart: boolean;
  atEnd: boolean;
};

// HTML specific reader state
export type HtmlReaderState = ReaderState & {
  glossing: USER_STATS_MODE_KEY_VALUES;
  segmentation: boolean;
  mouseover: boolean;
};

export type HtmlState = HtmlReaderState & {
  reader: any | undefined;
  location?: undefined | any;
  onUpdate: (state: ReaderSettings) => void;
};

export type InactiveReader = null;

export type LoadingReader = {
  isLoading: true;
  content: JSX.Element;
  navigator: null;
  state: null;
  manifest: null;
  type: null;
};

type CommonReader = {
  isLoading: false;
  content: JSX.Element;
  manifest: WebpubManifest;
};

export type HTMLActiveReader = CommonReader & {
  state: HtmlReaderState;
  navigator: HtmlNavigator;
  type: "HTML";
};

export type ActiveReader = HTMLActiveReader;

export type ReaderReturn = InactiveReader | LoadingReader | ActiveReader;

// should fetch and decrypt a resource
export type GetContent = (href: string) => Promise<string>;

export type UseWebReaderArguments = {
  webpubManifestUrl: string;
  getContent?: GetContent;
  doConfigUpdate: (state: ReaderSettings, location?: any) => void;
  injectables?: any[];
  injectablesFixed?: any[];
  height?: string; // CSS string (ie: "800px" or `calc(100vh-${CHROME_HEIGHT}`)
  growWhenScrolling?: boolean; // should the reader grow to fit content in scroll mode (ie. disregard the height)?
  readerSettings: ReaderSettings;
};

export type ActiveReaderArguments = UseWebReaderArguments & {
  manifest?: WebpubManifest;
};

// export type InactiveReaderArguments = undefined;

export type ReaderArguments = ActiveReaderArguments; //  | InactiveReaderArguments;

export type GetColor = (light: string, dark: string, sepia: string) => string;

export type WebReaderSWConfig = {
  cacheExpirationSeconds?: number;
};

export type PublicationConfig = {
  manifestUrl: string;
  proxyUrl?: string;
  // users can pass in a list of additonal urls
  // we will route with a stale-while-revalidate
  // strategy. Useful in CPW for the heavy fulfillment link.
  swrUrls?: string[];
};

export type PrecachePublicationsMessage = {
  type: typeof PRECACHE_PUBLICATIONS;
  publications: PublicationConfig[];
};
