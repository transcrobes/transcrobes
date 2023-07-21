import * as Comlink from "comlink";
import { createHashHistory } from "history";
import { ReactElement, useEffect } from "react";
import { Admin, CustomRoutes, Resource } from "react-admin";
import { Route } from "react-router-dom";
import { Workbox } from "workbox-window";
import Brocrobes from "./Brocrobes";
import Dashboard from "./Dashboard";
import { jwtTokenAuthProvider, platformHelper, setPlatformHelper, store } from "./app/createStore";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import NolayoutWrapper from "./components/NolayoutWrapper";
import contents from "./contents";
import Reader from "./contents/boocrobes/BookReader";
import VideoPlayerScreen from "./contents/moocrobes/VideoPlayerScreen";
import Textcrobes from "./contents/textcrobes/Textcrobes";
import { ServiceWorkerManager } from "./data/types";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";
import dictionaries from "./dictionaries";
import { setKnownWordsState } from "./features/word/knownWordsSlice";
import { addDictionaryProviders } from "./features/dictionary/dictionarySlice";
import { setMouseover, setRxdbInited, setSqliteInited, setTokenDetails } from "./features/ui/uiSlice";
import { setUser } from "./features/user/userSlice";
import goals from "./goals";
import Help from "./help/Help";
import imports from "./imports";
import languageclasses from "./languageclasses";
import { Layout } from "./layout";
import { darkTheme, lightTheme } from "./layout/themes";
import { ComponentsConfig } from "./lib/complexTypes";
import { refreshDictionaries } from "./lib/dictionary";
import { UUID, getLanguageFromPreferred } from "./lib/funclib";
import { getDefaultLanguageDictionaries, getI18nProvider } from "./lib/libMethods";
import {
  authProvider,
  history as history2,
  history as localHistory,
  setAuthProvider,
  setHistory,
} from "./lib/website-globals";
import Listrobes from "./listrobes/Listrobes";
import Notrobes from "./notrobes/Notrobes";
import WorkerDataProvider from "./ra-data-worker";
import Repetrobes from "./repetrobes/Repetrobes";
import Stats from "./stats/Stats";
import studentregistrations from "./studentregistrations";
import Studentstats from "./studentstats/Stats";
import surveys from "./surveys";
import Init from "./system/Init";
import Login from "./system/Login";
import RecoverPassword from "./system/RecoverPassword";
import ResetPassword from "./system/ResetPassword";
import Signup from "./system/Signup";
import System from "./system/System";
import teacherregistrations from "./teacherregistrations";
import { supported } from "./unsupported";
import userlists from "./userlists";
import { SharedService } from "./workers/SharedService";
import { ComlinkService, WebServiceWorkerDataManager } from "./workers/proxies";
import { RxdbDataManager, rxdbDataManagerKeys } from "./workers/rxdb/rxdata";
import { SqliteDataManager, sqliteDataManagerKeys } from "./workers/sqlite/sqldata";
import { serviceWorkerDataManagerKeys } from "./workers/swdata";
import { submitActivity } from "./lib/componentMethods";
import {
  ACTIVITY_DEBOUNCE,
  ACTIVITY_EVENTS_THROTTLE,
  ACTIVITY_TIMEOUT,
  CacheRefresh,
  GLOBAL_TIMER_DURATION_MS,
} from "./lib/types";
import { useIdleTimer } from "react-idle-timer";
import { NAME_PREFIX } from "./lib/interval/interval-decorator";
import SqlPen from "./system/SqlPen";

declare global {
  interface Window {
    asessionId: string;
    getTimestamp: () => number;
    lastTimestamp: number;
  }
}

let wb: Workbox;
if (import.meta.env.DEV) {
  wb = new Workbox("/dev-sw.js?dev-sw", { scope: "/", type: "module" });
} else {
  wb = new Workbox("/service-worker.js");
}
wb.register({ immediate: true });

async function portProvider(
  worker: Worker,
  loadedCallback: (event) => void,
  decacheCallback?: (refresh: CacheRefresh) => void,
) {
  const providerPort = await new Promise<MessagePort | Promise<MessagePort>>((resolve) => {
    worker.addEventListener(
      "message",
      (event) => {
        console.log("Worker sent back a (hopefully) port event", event);
        resolve(event.ports[0]);
      },
      { once: true },
    );
    worker.postMessage(null);
  });
  worker.addEventListener("message", (event) => {
    console.log("Worker sent back a decache event", event);
    if (event.data.type === "decache") {
      decacheCallback?.(event.data.value);
    } else if (event.data.type == "loaded") {
      loadedCallback(event);
    }
  });

  return providerPort;
}

let sharedSqliteService = new SharedService<SqliteDataManager>("sqlite", () =>
  portProvider(
    new Worker(new URL("./workers/sqlite/web-worker.ts", import.meta.url), {
      type: "module",
    }),
    (event) => {
      if (event.data.source === "SQLITE_WEB_WORKER") {
        console.log("Sqlite worker loaded", event);
        store.dispatch(setSqliteInited(true));
      } else {
        console.error("Sqlite worker sent invalid loaded event", event);
      }
    },
    (refresh) => {
      if (refresh.name === "cards") {
        store.dispatch(setKnownWordsState(refresh.values));
      } else {
        console.error("Unknown cache refresh", refresh);
      }
    },
  ),
);
sharedSqliteService.activate();

let sharedRxdbService = new SharedService<RxdbDataManager>("rxdb", () =>
  portProvider(
    new Worker(new URL("./workers/rxdb/web-worker.ts", import.meta.url), {
      type: "module",
    }),
    (event) => {
      if (event.data.source === "RXDB_WEB_WORKER") {
        console.log("Rx worker loaded", event);
        store.dispatch(setRxdbInited(true));
      } else {
        console.error("Rx worker sent invalid loaded event", event);
      }
    },
  ),
);
sharedRxdbService.activate();

setHistory(createHashHistory());
setAuthProvider(jwtTokenAuthProvider());

const wsWDM = new WebServiceWorkerDataManager([
  { keys: sqliteDataManagerKeys, partial: sharedSqliteService },
  { keys: rxdbDataManagerKeys, partial: sharedRxdbService },
]);
setPlatformHelper(wsWDM.proxy);

async function initComlink() {
  const { port1, port2 } = new MessageChannel();
  const msg = {
    comlinkInit: true,
    port: port1,
  };
  navigator.serviceWorker.controller?.postMessage(msg, [port1]);
  const swProxy = Comlink.wrap<ServiceWorkerManager>(port2);
  wsWDM.addManager({ keys: serviceWorkerDataManagerKeys, partial: new ComlinkService(swProxy) });
}
if (navigator.serviceWorker.controller) {
  console.log("Initing comlink for the first time");
  initComlink();
}
navigator.serviceWorker.addEventListener("controllerchange", () => {
  console.log("Initing comlink for a second time...");
  initComlink();
});

let dataProvider = WorkerDataProvider({ request: (message) => platformHelper.dataProvider(message) });

window.componentsConfig = {
  proxy: platformHelper,
  url: new URL(window.location.href),
};
function shouldRedirectUninited(url: string): boolean {
  const m = url.split("/#/")[1];
  if (
    m &&
    (m.startsWith("login") ||
      m.startsWith("init") ||
      m.startsWith("signup") ||
      m.startsWith("reset-password") ||
      m.startsWith("recover-password"))
  ) {
    return false;
  } else {
    return true;
  }
}

window.getTimestamp = () => {
  const now = Date.now();
  if (window.lastTimestamp && window.lastTimestamp > now) {
    window.lastTimestamp += 1;
  } else {
    window.lastTimestamp = now;
  }
  return window.lastTimestamp;
};

interface Props {
  config: ComponentsConfig;
}

const sessionId = (window.asessionId = UUID().toString());

function App({ config }: Props): ReactElement {
  const dispatch = useAppDispatch();
  useIdleTimer({
    onAction: () => {
      if (inited) {
        platformHelper.refreshSession({
          id: sessionId,
          timestamp: Date.now(),
        });
      }
    },
    onIdle: () => {
      submitActivity(config.proxy, "end", "web", location.href, sessionId, window.getTimestamp);
    },
    onActive: () => {
      submitActivity(config.proxy, "start", "web", location.href, sessionId, window.getTimestamp);
    },
    timeout: ACTIVITY_TIMEOUT,
    debounce: ACTIVITY_DEBOUNCE,
    eventsThrottle: ACTIVITY_EVENTS_THROTTLE,
  });
  const inited = useAppSelector((state) => state.ui.rxdbInited && state.ui.sqliteInited);
  useEffect(() => {
    if (inited) {
      (async () => {
        store.dispatch(setKnownWordsState(await platformHelper.getKnownWords()));
        await refreshDictionaries(store, platformHelper, fromLang);
      })();
    }
  }, [inited]);

  function tds() {
    dispatch(setTokenDetails(undefined));
  }
  function mo() {
    dispatch(setMouseover(undefined));
  }
  let unlisten: Function | undefined;

  useEffect(() => {
    if (!supported) {
      window.location.href = "/unsupported.html";
    }

    (async () => {
      const dexieUser = await getUserDexie();
      dispatch(setUser(dexieUser));
      dispatch(addDictionaryProviders(getDefaultLanguageDictionaries(dexieUser.user.fromLang)));
    })();
    document.addEventListener("click", tds);
    document.addEventListener("click", mo);
    unlisten = history2?.listen(() => {
      submitActivity(config.proxy, "start", "web", window.location.href, sessionId, window.getTimestamp);
    });
    window.addEventListener("beforeunload", () => {
      submitActivity(config.proxy, "end", "web", window.location.href, sessionId, window.getTimestamp);
    });

    return () => {
      document.removeEventListener("click", tds);
      document.removeEventListener("click", mo);
      if (unlisten) unlisten();
    };
  }, []);
  const {
    username,
    user: { fromLang }, // trackingEndpoint, trackingKey
  } = useAppSelector((state) => state.userData);
  useEffect(() => {
    (async () => {
      if (username) {
        // if (!IS_DEV && trackingKey && trackingEndpoint) {
        //   if (tracker) {
        //     tracker.stop();
        //   } else {
        //     setTracker(
        //       new Tracker({
        //         projectKey: trackingKey,
        //         ingestPoint: trackingEndpoint,
        //         __DISABLE_SECURE_MODE: IS_DEV,
        //       }),
        //     );
        //   }
        //   try {
        //     tracker.start().then(() => {
        //       tracker.setUserID(username);
        //     });
        //   } catch (e) {
        //     console.error(e);
        //   }
        // }

        if (await isInitialisedAsync(username)) {
          platformHelper.refreshSession({
            id: sessionId,
            timestamp: Date.now(),
          });
          submitActivity(config.proxy, "start", "web", window.location.href, sessionId, window.getTimestamp);
          setInterval(
            () => {
              if (document.visibilityState === "visible") {
                submitActivity(
                  window.componentsConfig.proxy,
                  "continue",
                  "web",
                  window.location.href,
                  sessionId,
                  window.getTimestamp,
                );
              }
            },
            GLOBAL_TIMER_DURATION_MS,
            NAME_PREFIX + "globalTimer",
          );
        } else if (shouldRedirectUninited(window.location.href)) {
          window.location.href = "/#/init";
        }
      }
    })();
  }, [username]);

  return (
    (
      <>
        <Admin
          theme={lightTheme}
          darkTheme={darkTheme}
          authProvider={authProvider}
          dataProvider={dataProvider}
          i18nProvider={getI18nProvider(getLanguageFromPreferred(navigator.languages))}
          dashboard={() => Dashboard()}
          title="Transcrobes"
          layout={Layout}
          loginPage={(props) => <Login {...props} />}
          history={localHistory}
        >
          {/* disableTelemetry be nice for now */}
          {(permissions) => [
            // _permissions === "admin" && <Resource name="users" {...users} />,
            permissions.includes("teacher") && <Resource name="teacherregistrations" {...teacherregistrations} />,
            <Resource name="languageclasses" {...languageclasses} />,
            <Resource name="studentregistrations" {...studentregistrations} />,
            <Resource name="imports" {...imports} />,
            <Resource name="contents" {...contents} />,
            <Resource name="userdictionaries" {...dictionaries} />,
            <Resource name="goals" {...goals} />,
            <Resource name="userlists" {...userlists} />,
            <Resource name="surveys" {...surveys} />,
            <CustomRoutes>
              permissions.includes("teacher") && ( <Route path="/studentstats" element={<Studentstats />} />
              ),
              <Route path="/notrobes" element={<Notrobes proxy={config.proxy} url={config.url} />} />,
              <Route path="/listrobes" element={<Listrobes proxy={config.proxy} />} />,
              <Route path="/stats" element={<Stats />} />,
              {/* <Route path="/exports" element={<Exports proxy={config.proxy} />} />, */}
              <Route path="/repetrobes" element={<Repetrobes proxy={config.proxy} />} />,
              <Route path="/textcrobes" element={<Textcrobes proxy={config.proxy} />} />,
              <Route path="/contents/:id/watch" element={<VideoPlayerScreen proxy={config.proxy} />} />,
              <Route path="/brocrobes" element={<Brocrobes />} />,
              <Route path="/system" element={<System proxy={config.proxy} />} />,
              <Route path="/sql" element={<SqlPen proxy={config.proxy} />} />,
              <Route path="/help" element={<Help />} />
            </CustomRoutes>,
            <CustomRoutes noLayout>
              <Route path="/contents/:id/read" element={<Reader proxy={config.proxy} />} />
              <Route
                path="/recover-password"
                element={
                  <NolayoutWrapper proxy={config.proxy} userMenu={false}>
                    <RecoverPassword />
                  </NolayoutWrapper>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <NolayoutWrapper proxy={config.proxy} userMenu={false}>
                    <ResetPassword />
                  </NolayoutWrapper>
                }
              />
              <Route
                path="/signup"
                element={
                  <NolayoutWrapper proxy={config.proxy} userMenu={false}>
                    <Signup />
                  </NolayoutWrapper>
                }
              />
              <Route
                path="/init"
                element={
                  <NolayoutWrapper proxy={config.proxy} userMenu={true}>
                    <Init />
                  </NolayoutWrapper>
                }
              />
            </CustomRoutes>,
          ]}
        </Admin>
      </>
    ) || <></>
  );
}

export default App;
