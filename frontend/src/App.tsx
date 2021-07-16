import { ReactElement, useEffect, useState } from "react";
import { Admin, Resource } from "react-admin";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { Workbox } from "workbox-window";

import "./css/components.css";
import customRoutes from "./routes";
import imports from "./imports";
import contents from "./contents";
import goals from "./goals";
import userlists from "./userlists";
import surveys from "./surveys";
import themeReducer from "./themeReducer";
import { Login, Layout } from "./layout";
import englishMessages from "./i18n/en";
import jwtTokenAuthProvider, { isInitialised } from "./lib/JWTAuthProvider";
import SWDataProvider from "./ra-data-sw";
import Dashboard from "./Dashboard";
import { ComponentsAppConfig, ThemeName } from "./lib/types";
import { ServiceWorkerProxy } from "./lib/proxies";
import { ComponentsConfig } from "./lib/complexTypes";

declare global {
  interface Window {
    componentsConfig: ComponentsConfig;
    readerConfig: ComponentsAppConfig;
    videoConfig: ComponentsAppConfig;
  }
}
const authProvider = jwtTokenAuthProvider();

const wb = new Workbox("/service-worker.js");
wb.register();

const dataProvider = SWDataProvider({ wb: wb });

const i18nProvider = polyglotI18nProvider((_locale) => {
  return englishMessages;
}, "en");

window.componentsConfig = {
  dataProvider: dataProvider,
  proxy: new ServiceWorkerProxy(wb),
  url: new URL(window.location.href),
  langPair: "zh-Hans:en", // FIXME: where to put this?
};

function App(): ReactElement {
  const [inited, setInited] = useState<boolean | null>(null);

  useEffect(() => {
    (async function () {
      const isInited = await isInitialised();
      if (!isInited && window.location.href !== "/#/init") {
        window.location.href = "/#/init";
      } else {
        setInited(isInited);
      }
    })();
  }, []);

  useEffect(() => {
    window.componentsConfig.proxy.init(
      {},
      () => {
        return "";
      },
      () => {
        return "";
      },
    );
  }, [inited]);

  return (
    <Admin
      initialState={{ theme: (localStorage.getItem("mode") as ThemeName) || "light" }}
      authProvider={authProvider}
      dataProvider={dataProvider}
      i18nProvider={i18nProvider}
      dashboard={() => Dashboard({ config: window.componentsConfig })}
      title="Transcrobes"
      layout={Layout}
      loginPage={Login}
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
