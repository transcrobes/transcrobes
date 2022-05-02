import Tracker from "@openreplay/tracker";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { ReactElement, useEffect, useState } from "react";
import { Admin, CustomRoutes, Resource } from "react-admin";
import { Route } from "react-router-dom";
import { authProvider, dataProvider, history as localHistory, setTracker, store, tracker } from "./app/createStore";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import Brocrobes from "./Brocrobes";
import contents from "./contents";
import Reader from "./contents/boocrobes/BookReader";
import VideoPlayerScreen from "./contents/moocrobes/VideoPlayerScreen";
import Textcrobes from "./contents/textcrobes/Textcrobes";
import Dashboard from "./Dashboard";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";
import dictionaries from "./dictionaries";
import Exports from "./exports/Exports";
import { setCardWordsState } from "./features/card/knownCardsSlice";
import { setMouseover, setTokenDetails } from "./features/ui/uiSlice";
import { setUser } from "./features/user/userSlice";
import goals from "./goals";
import Help from "./help/Help";
import englishMessages from "./i18n/en";
import imports from "./imports";
import { Layout } from "./layout";
import { darkTheme, lightTheme } from "./layout/themes";
import { ComponentsConfig } from "./lib/complexTypes";
import { refreshDictionaries } from "./lib/dictionary";
import { IS_DEV, SerialisableDayCardWords } from "./lib/types";
import Listrobes from "./listrobes/Listrobes";
import Notrobes from "./notrobes/Notrobes";
import Repetrobes from "./repetrobes/Repetrobes";
import Stats from "./stats/Stats";
import surveys from "./surveys";
import Init from "./system/Init";
import Login from "./system/Login";
import Logout from "./system/Logout";
import RecoverPassword from "./system/RecoverPassword";
import ResetPassword from "./system/ResetPassword";
import Signup from "./system/Signup";
import System from "./system/System";
import userlists from "./userlists";

const i18nProvider = polyglotI18nProvider((_locale) => {
  return englishMessages;
}, "en");

const GLOBAL_TIMER_DURATION_MS = IS_DEV ? 2000 : 5000;

const EVENT_SOURCE = "App.tsx";
const DATA_SOURCE = "App.tsx";

setInterval(async () => {
  const needsReload = await window.componentsConfig.proxy.sendMessagePromise<boolean>({
    source: EVENT_SOURCE,
    type: "NEEDS_RELOAD",
  });
  if (needsReload) {
    console.log("Reloading after NEEDS_RELOAD");
    location.reload();
  }
}, GLOBAL_TIMER_DURATION_MS);

interface Props {
  config: ComponentsConfig;
}

function App({ config }: Props): ReactElement {
  const [inited, setInited] = useState(false);
  const dispatch = useAppDispatch();

  const theme = useAppSelector((state) => (state.theme === "dark" ? darkTheme : lightTheme));
  useEffect(() => {
    (async () => {
      dispatch(setUser(await getUserDexie()));
    })();

    document.addEventListener("click", () => dispatch(setTokenDetails(undefined)));
    document.addEventListener("click", () => dispatch(setMouseover(undefined)));
    return () => {
      document.removeEventListener("click", () => dispatch(setTokenDetails(undefined)));
      document.removeEventListener("click", () => dispatch(setMouseover(undefined)));
    };
  }, []);
  const {
    username,
    user: { trackingEndpoint, trackingKey },
  } = useAppSelector((state) => state.userData);
  useEffect(() => {
    (async () => {
      if (username) {
        if (!IS_DEV && trackingKey && trackingEndpoint) {
          if (tracker) {
            tracker.stop();
          } else {
            setTracker(
              new Tracker({
                projectKey: trackingKey,
                ingestPoint: trackingEndpoint,
                __DISABLE_SECURE_MODE: IS_DEV,
              }),
            );
          }
          tracker.start().then(() => {
            tracker.setUserID(username);
          });
        }

        if (await isInitialisedAsync(username)) {
          await config.proxy.asyncInit({ username: username });
          setInited(true);
          dispatch(
            setCardWordsState(
              await config.proxy.sendMessagePromise<SerialisableDayCardWords>({
                source: DATA_SOURCE,
                type: "getSerialisableCardWords",
              }),
            ),
          );
          await refreshDictionaries(store, config.proxy);
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
      <Admin
        theme={theme}
        authProvider={authProvider}
        dataProvider={dataProvider}
        i18nProvider={i18nProvider}
        dashboard={() => Dashboard({ config, inited })}
        title="Transcrobes"
        layout={Layout}
        loginPage={Login}
        history={localHistory}
        // @ts-ignore
        logoutButton={(props) => <Logout proxy={componentsConfig.proxy} {...props} />}
      >
        {/* disableTelemetry be nice for now */}
        {(_permissions) => [
          <Resource name="imports" {...imports} />,
          <Resource name="contents" {...contents} />,
          <Resource name="userdictionaries" {...dictionaries} />,
          <Resource name="goals" {...goals} />,
          <Resource name="userlists" {...userlists} />,
          <Resource name="surveys" {...surveys} />,
          <CustomRoutes>
            <Route path="/notrobes" element={<Notrobes proxy={config.proxy} url={config.url} />} />
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/recover-password" element={<RecoverPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/contents/:id/read" element={<Reader proxy={config.proxy} />} />
            <Route path="/init" element={<Init proxy={config.proxy} />} />
          </CustomRoutes>,
        ]}
      </Admin>
    )) || <></>
  );
}

export default App;
