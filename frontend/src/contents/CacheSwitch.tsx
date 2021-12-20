import { ReactElement, useEffect, useState } from "react";
import { useRecordContext } from "react-admin";
import {
  Content,
  CONTENT_TYPE,
  ONE_YEAR_IN_SECS,
  PROCESSING,
  SUBS_DATA_SUFFIX,
} from "../lib/types";
import { Switch } from "@material-ui/core";
import { PrecachePublicationsMessage } from "../web-reader/types";
import { PRECACHE_PUBLICATIONS, WEBPUB_CACHE_NAME } from "../web-reader/constants";
import { getContentBaseURL, getManifestURL, getSubsURL, handleBadResponse } from "../lib/funclib";
import { registerRoute } from "workbox-routing";
import { ExpirationPlugin } from "workbox-expiration";

import { CacheFirst } from "workbox-strategies";

const cacheFirst = new CacheFirst({
  cacheName: WEBPUB_CACHE_NAME,
  plugins: [
    new ExpirationPlugin({
      maxAgeSeconds: ONE_YEAR_IN_SECS,
    }),
  ],
});
// FIXME: any
export default function CacheSwitch(props: any): ReactElement {
  const [cached, setCached] = useState<boolean>(false);
  const [initialised, setInitialised] = useState<boolean>(false);

  const content = useRecordContext(props) as Content;
  let url: URL;
  if (content.contentType === CONTENT_TYPE.BOOK) {
    url = new URL(getManifestURL(content.id.toString()), window.location.href);
  } else if (content.contentType === CONTENT_TYPE.VIDEO) {
    url = new URL(getSubsURL(content.id.toString()), window.location.href);
  } else {
    throw new Error("Impossible to cache an unknown type of content");
  }

  useEffect(() => {
    caches.match(url.href).then(function (response) {
      setCached(!!response);
      setInitialised(true);
    });
  }, []);

  useEffect(() => {
    if (initialised) {
      if (cached) {
        if (content.contentType === CONTENT_TYPE.BOOK) {
          const message: PrecachePublicationsMessage = {
            type: PRECACHE_PUBLICATIONS,
            publications: [{ manifestUrl: url.href }],
          };
          navigator.serviceWorker.controller?.postMessage(message);
        } else if (content.contentType === CONTENT_TYPE.VIDEO) {
          (async () => {
            const cache = await caches.open(WEBPUB_CACHE_NAME);

            // route it so that workbox knows to respond.
            registerRoute(url.href, cacheFirst);
            registerRoute(url.href + SUBS_DATA_SUFFIX, cacheFirst);
            const results = await Promise.all([
              fetch(url.href),
              fetch(url.href + SUBS_DATA_SUFFIX),
            ]);
            for (const res of results) {
              handleBadResponse(res.url, res);
              await cache.put(res.url, res.clone());
            }
          })();
        } else {
          throw new Error("Impossible to cache an unknown type of content");
        }
      } else {
        caches.open(WEBPUB_CACHE_NAME).then((cache) => {
          cache.keys().then((keys) => {
            keys.forEach((item) => {
              if (item.url.includes(getContentBaseURL(content.id.toString()))) {
                cache.delete(item.url);
              }
            });
          });
        });
      }
    }
  }, [cached]);

  if (content.processing === PROCESSING.FINISHED) {
    return (
      <Switch
        checked={cached}
        onClick={(e: React.MouseEvent<HTMLElement>) => {
          e.stopPropagation();
          setCached(!cached);
        }}
      />
    );
  } else {
    return <></>;
  }
}
