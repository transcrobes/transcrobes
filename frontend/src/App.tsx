import Tracker from "@openreplay/tracker";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { ReactElement, useEffect, useState } from "react";
import { Admin, Resource } from "react-admin";
import { authProvider, dataProvider, history as localHistory, setTracker, store, tracker } from "./app/createStore";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import contents from "./contents";
import Dashboard from "./Dashboard";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";
import dictionaries from "./dictionaries";
import { setState } from "./features/card/knownCardsSlice";
import { setMouseover, setTokenDetails } from "./features/ui/uiSlice";
import { setUser } from "./features/user/userSlice";
import goals from "./goals";
import englishMessages from "./i18n/en";
import imports from "./imports";
import { Layout } from "./layout";
import { ComponentsConfig } from "./lib/complexTypes";
import { refreshDictionaries } from "./lib/dictionary";
import { IS_DEV, SerialisableDayCardWords } from "./lib/types";
import customRoutes from "./routes";
import surveys from "./surveys";
import Login from "./system/Login";
import Logout from "./system/Logout";
import userlists from "./userlists";

const i18nProvider = polyglotI18nProvider((_locale) => {
  return englishMessages;
}, "en");

const GLOBAL_TIMER_DURATION_MS = IS_DEV ? 1000 : 5000;

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
  componentsConfig: ComponentsConfig;
}

function App({ componentsConfig }: Props): ReactElement {
  const [inited, setInited] = useState(false);
  const dispatch = useAppDispatch();

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
          await componentsConfig.proxy.asyncInit({ username: username });
          setInited(true);
          dispatch(
            setState(
              await componentsConfig.proxy.sendMessagePromise<SerialisableDayCardWords>({
                source: DATA_SOURCE,
                type: "getSerialisableCardWords",
              }),
            ),
          );
          await refreshDictionaries(store, componentsConfig.proxy);
        } else if (shouldRedirectUninited(window.location.href)) {
          window.location.href = "/#/init";
        }
      }
    })();
  }, [username, trackingEndpoint, trackingKey]);

  function shouldRedirectUninited(url: string): boolean {
    const m = url.split("/#/")[1];
    if (
      (m && m.startsWith("login")) ||
      m.startsWith("init") ||
      m.startsWith("signup") ||
      m.startsWith("reset-password") ||
      m.startsWith("recover-password")
    ) {
      return false;
    } else {
      return true;
    }
  }

  return (
    (dataProvider && (
      <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        i18nProvider={i18nProvider}
        dashboard={() => Dashboard({ config: componentsConfig, inited })}
        title="Transcrobes"
        layout={Layout}
        loginPage={Login}
        history={localHistory}
        // @ts-ignore
        logoutButton={(props) => <Logout proxy={componentsConfig.proxy} {...props} />}
        customRoutes={customRoutes(componentsConfig)}
      >
        {/* disableTelemetry be nice for now */}
        {(_permissions) => [
          <Resource name="imports" {...imports} />,
          <Resource name="contents" {...contents} />,
          <Resource name="userdictionaries" {...dictionaries} />,
          <Resource name="goals" {...goals} />,
          <Resource name="userlists" {...userlists} />,
          <Resource name="surveys" {...surveys} />,
        ]}
      </Admin>
    )) || <></>
  );
}

export default App;
