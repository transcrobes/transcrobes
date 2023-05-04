import { ReactElement, useEffect, useState } from "react";
import { Admin, CustomRoutes, Resource } from "react-admin";
import { useIdleTimer } from "react-idle-timer";
import { Route } from "react-router-dom";
import { authProvider, dataProvider, history as history2, history as localHistory, store } from "./app/createStore";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import Brocrobes from "./Brocrobes";
import NolayoutWrapper from "./components/NolayoutWrapper";
import contents from "./contents";
import Reader from "./contents/boocrobes/BookReader";
import VideoPlayerScreen from "./contents/moocrobes/VideoPlayerScreen";
import Textcrobes from "./contents/textcrobes/Textcrobes";
import Dashboard from "./Dashboard";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";
import dictionaries from "./dictionaries";
import Exports from "./exports/Exports";
import { setCardWordsState } from "./features/card/knownCardsSlice";
import { addDictionaryProviders } from "./features/dictionary/dictionarySlice";
import { setMouseover, setTokenDetails } from "./features/ui/uiSlice";
import { setUser } from "./features/user/userSlice";
import goals from "./goals";
import Help from "./help/Help";
import imports from "./imports";
import languageclasses from "./languageclasses";
import { Layout } from "./layout";
import { darkTheme, lightTheme } from "./layout/themes";
import { ComponentsConfig } from "./lib/complexTypes";
import { submitActivity } from "./lib/componentMethods";
import { refreshDictionaries } from "./lib/dictionary";
import { UUID, getLanguageFromPreferred } from "./lib/funclib";
import { NAME_PREFIX } from "./lib/interval/interval-decorator";
import { getDefaultLanguageDictionaries, getI18nProvider } from "./lib/libMethods";
import {
  ACTIVITY_DEBOUNCE,
  ACTIVITY_EVENTS_THROTTLE,
  ACTIVITY_TIMEOUT,
  GLOBAL_TIMER_DURATION_MS,
  SerialisableDayCardWords,
} from "./lib/types";
import Listrobes from "./listrobes/Listrobes";
import Notrobes from "./notrobes/Notrobes";
import Repetrobes from "./repetrobes/Repetrobes";
import Stats from "./stats/Stats";
import studentregistrations from "./studentregistrations";
import Studentstats from "./studentstats/Stats";
import surveys from "./surveys";
import Init from "./system/Init";
import Login from "./system/Login";
import RecoverPassword from "./system/RecoverPassword";
import Signup from "./system/Signup";
import System from "./system/System";
import teacherregistrations from "./teacherregistrations";
import userlists from "./userlists";
import { supported } from "./unsupported";

declare global {
  interface Window {
    asessionId: string;
    getTimestamp: () => number;
    lastTimestamp: number;
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

const EVENT_SOURCE = "App.tsx";
const DATA_SOURCE = "App.tsx";

interface Props {
  config: ComponentsConfig;
}

const sessionId = (window.asessionId = UUID().toString());

function App({ config }: Props): ReactElement {
  const [inited, setInited] = useState(false);
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => (state.theme === "dark" ? darkTheme : lightTheme));
  useIdleTimer({
    onAction: () => {
      if (inited) {
        config.proxy.sendMessagePromise<boolean>({
          source: "App.tsx",
          type: "refreshSession",
          value: {
            id: sessionId,
            timestamp: Date.now().toString(),
          },
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
    user: { trackingEndpoint, trackingKey, fromLang },
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
          await config.proxy.asyncInit({ username: username });
          await config.proxy.sendMessagePromise<boolean>({
            source: DATA_SOURCE,
            type: "refreshSession",
            value: {
              id: sessionId,
              timestamp: Date.now().toString(),
            },
          });
          dispatch(
            setCardWordsState(
              await config.proxy.sendMessagePromise<SerialisableDayCardWords>({
                source: DATA_SOURCE,
                type: "getSerialisableCardWords",
              }),
            ),
          );
          await refreshDictionaries(store, config.proxy, fromLang);
          setInited(true);
          submitActivity(config.proxy, "start", "web", window.location.href, sessionId, window.getTimestamp);
          setInterval(
            () => {
              window.componentsConfig.proxy
                .sendMessagePromise<boolean>({
                  source: EVENT_SOURCE,
                  type: "NEEDS_RELOAD",
                })
                .then((needsReload) => {
                  if (needsReload) {
                    console.log("Reloading after NEEDS_RELOAD");
                    location.reload();
                  }
                });
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
  }, [username, trackingEndpoint, trackingKey]);

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
  return (
    (dataProvider && (
      <>
        <Admin
          theme={theme}
          authProvider={authProvider}
          dataProvider={dataProvider}
          i18nProvider={getI18nProvider(getLanguageFromPreferred(navigator.languages))}
          dashboard={() => Dashboard({ config, inited })}
          title="Transcrobes"
          layout={Layout}
          loginPage={(props) => <Login {...props} config={config} />}
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
              <Route path="/exports" element={<Exports proxy={config.proxy} />} />,
              <Route path="/repetrobes" element={<Repetrobes proxy={config.proxy} />} />,
              <Route path="/textcrobes" element={<Textcrobes proxy={config.proxy} />} />,
              <Route path="/contents/:id/watch" element={<VideoPlayerScreen proxy={config.proxy} />} />,
              <Route path="/brocrobes" element={<Brocrobes />} />,
              <Route path="/system" element={<System proxy={config.proxy} />} />,
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
                    <Init proxy={config.proxy} />
                  </NolayoutWrapper>
                }
              />
            </CustomRoutes>,
          ]}
        </Admin>
      </>
    )) || <></>
  );
}

export default App;
