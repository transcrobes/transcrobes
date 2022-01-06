import { ReactElement, useEffect, useState } from "react";
import { Admin, Resource } from "react-admin";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { Workbox } from "workbox-window";
import customRoutes from "./routes";
import imports from "./imports";
import contents from "./contents";
import goals from "./goals";
import userlists from "./userlists";
import surveys from "./surveys";
import themeReducer from "./themeReducer";
import { Layout } from "./layout";
import Login from "./system/Login";
import Logout from "./system/Logout";
import englishMessages from "./i18n/en";
import jwtTokenAuthProvider, {
  getUsername,
  getValue,
  isInitialisedAsync,
} from "./lib/JWTAuthProvider";
import SWDataProvider from "./ra-data-sw";
import Dashboard from "./Dashboard";
import { ComponentsAppConfig, ThemeName } from "./lib/types";
import { ServiceWorkerProxy } from "./lib/proxies";
import { ComponentsConfig } from "./lib/complexTypes";
import { defineElements, setLangPair } from "./lib/components";

declare global {
  interface Window {
    componentsConfig: ComponentsConfig;
    readerConfig: ComponentsAppConfig;
    videoConfig: ComponentsAppConfig;
  }
}
const authProvider = jwtTokenAuthProvider();

const wb = new Workbox("/service-worker.js");
wb.register({ immediate: true });
defineElements();

const dataProvider = SWDataProvider({ wb: wb });

const i18nProvider = polyglotI18nProvider((_locale) => {
  return englishMessages;
}, "en");

const DEFAULT_LANGUAGE_PAIR = "zh-Hans:en";
window.componentsConfig = {
  dataProvider: dataProvider,
  proxy: new ServiceWorkerProxy(wb),
  url: new URL(window.location.href),
  langPair: DEFAULT_LANGUAGE_PAIR,
};

setInterval(async () => {
  const lusername = await getUsername();
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

function App(): ReactElement {
  const [inited, setInited] = useState(false);
  useEffect(() => {
    (async () => {
      const lusername = await getUsername();
      const langPair = await getValue("lang_pair");
      if (!lusername || !langPair) {
        throw new Error(
          "Unable to find a username or the language pair, can't do much without those",
        );
      }
      window.componentsConfig.langPair = langPair;
      setLangPair(langPair);
      if (lusername && (await isInitialisedAsync(lusername))) {
        window.componentsConfig.proxy.init(
          { username: lusername },
          () => {
            setInited(true);
            return "";
          },
          () => "",
        );
      } else if (shouldRedirectUninited(window.location.href)) {
        window.location.href = "/#/init";
      }
    })();
  }, []);

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
    <Admin
      initialState={{ theme: (localStorage.getItem("mode") as ThemeName) || "light" }}
      authProvider={authProvider}
      dataProvider={dataProvider}
      i18nProvider={i18nProvider}
      dashboard={() => Dashboard({ config: window.componentsConfig, inited })}
      title="Transcrobes"
      layout={Layout}
      loginPage={Login}
      // @ts-ignore
      logoutButton={(props) => <Logout proxy={window.componentsConfig.proxy} {...props} />}
      customRoutes={customRoutes(window.componentsConfig)}
      customReducers={{ theme: themeReducer }}
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
  );
}

export default App;
