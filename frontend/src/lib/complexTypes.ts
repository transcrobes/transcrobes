import { DataProvider } from "react-admin";
import { ServiceWorkerProxy } from "./proxies";

export type ComponentsConfig = {
  dataProvider: DataProvider;
  proxy: ServiceWorkerProxy;
  url: URL;
};
