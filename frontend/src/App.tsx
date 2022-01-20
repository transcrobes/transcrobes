import { ReactElement, useEffect, useState } from "react";
import { Admin, Resource } from "react-admin";
import polyglotI18nProvider from "ra-i18n-polyglot";
import customRoutes from "./routes";
import imports from "./imports";
import contents from "./contents";
import goals from "./goals";
import userlists from "./userlists";
import surveys from "./surveys";
import { Layout } from "./layout";
import Login from "./system/Login";
import Logout from "./system/Logout";
import englishMessages from "./i18n/en";
import Dashboard from "./Dashboard";
import { ComponentsConfig } from "./lib/complexTypes";
import { authProvider, dataProvider, store, history as localHistory } from "./app/createStore";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { setUser } from "./features/user/userSlice";
import { setState } from "./features/card/knownCardsSlice";
import { SerialisableDayCardWords } from "./lib/types";
import { setMouseover, setTokenDetails } from "./features/ui/uiSlice";

const i18nProvider = polyglotI18nProvider((_locale) => {
  return englishMessages;
}, "en");

setInterval(async () => {
  const lusername = store.getState().userData.username;
  if (lusername && (await isInitialisedAsync(lusername))) {
    const needsReload = await window.componentsConfig.proxy.sendMessagePromise<boolean>({
      source: "App.tsx",
      type: "NEEDS_RELOAD",
      value: "",
    });
    if (needsReload) {
      console.log("Reloading after NEEDS_RELOAD");
      location.reload();
    }
  }
}, 2000);

interface Props {
  componentsConfig: ComponentsConfig;
}

function App({ componentsConfig }: Props): ReactElement {
  const [inited, setInited] = useState(false);
  const dispatch = useAppDispatch();
  useEffect(() => {
    (async () => {
      const user = await getUserDexie();
      dispatch(setUser(user));
    })();
    document.addEventListener("click", () => dispatch(setTokenDetails(undefined)));
    document.addEventListener("click", () => dispatch(setMouseover(undefined)));
    return () => {
      document.removeEventListener("click", () => dispatch(setTokenDetails(undefined)));
      document.removeEventListener("click", () => dispatch(setMouseover(undefined)));
    };
  }, []);
  const username = useAppSelector((state) => state.userData.username);
  useEffect(() => {
    (async () => {
      if (username) {
        if (await isInitialisedAsync(username)) {
          await componentsConfig.proxy.asyncInit({ username: username });
          setInited(true);
          dispatch(
            setState(
              await componentsConfig.proxy.sendMessagePromise<SerialisableDayCardWords>({
                source: "App.tsx",
                type: "getSerialisableCardWords",
                value: "",
              }),
            ),
          );
        } else if (shouldRedirectUninited(window.location.href)) {
          window.location.href = "/#/init";
        }
      }
    })();
  }, [username]);

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
          <Resource name="goals" {...goals} />,
          <Resource name="userlists" {...userlists} />,
          <Resource name="surveys" {...surveys} />,
        ]}
      </Admin>
    )) || <></>
  );
}

export default App;
