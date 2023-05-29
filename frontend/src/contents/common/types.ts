import type { ThemeType } from "react-admin";
import {
  FontFamily,
  FontFamilyChinese,
  GlossPosition,
  BOOCROBES_HEADER_HEIGHT,
  PublicationConfig,
} from "../../lib/types";

// we have to set a constant height to make this work with R2D2BC
export const FOOTER_HEIGHT = 48;
export const CHROME_HEIGHT = BOOCROBES_HEADER_HEIGHT + FOOTER_HEIGHT;

export const DEFAULT_HEIGHT = `calc(100vh - ${CHROME_HEIGHT}px)`;
export const DEFAULT_SHOULD_GROW_WHEN_SCROLLING = true;

export const WEBPUB_CACHE_NAME = "webpub-cache";
export const AGE_HEADER = "sw-fetched-on";
export const PRECACHE_PUBLICATIONS = "PRECACHE_PUBLICATIONS";
// one week worth of seconds
export const CACHE_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;

// the MimeType for a packaged epub
export const EpubMimeType = "application/epub";
// the Mimetype for a generic webpub
export const WebpubMimeType = "application/webpub";

export const DEFAULT_FONT_SIZE = 100;
export const DEFAULT_FONT_FAMILY: FontFamily = "Original";
export const DEFAULT_FONT_FAMILY_CHINESE: FontFamilyChinese = "notasanslight";
export const DEFAULT_GLOSS_POSITION: GlossPosition = "row";

export type ColorMode = ThemeType | "sepia";
export type D2ColorMode = "readium-default-on" | "readium-night-on" | "readium-sepia-on";

export type PrecachePublicationsMessage = {
  type: typeof PRECACHE_PUBLICATIONS;
  publications: PublicationConfig[];
};

export type WebReaderSWConfig = {
  cacheExpirationSeconds?: number;
};
