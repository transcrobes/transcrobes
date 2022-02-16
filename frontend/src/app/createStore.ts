import Tracker from "@openreplay/tracker";
import { configureStore } from "@reduxjs/toolkit";
import { connectRouter } from "connected-react-router";
import { createHashHistory, History } from "history";
import { fetchUtils } from "ra-core";
import { adminReducer, adminSaga, AuthProvider, DataProvider, USER_LOGOUT } from "react-admin";
import { combineReducers } from "redux";
import createSagaMiddleware from "redux-saga";
import { all, fork } from "redux-saga/effects";
import { Workbox } from "workbox-window";
import { getUserDexie, isInitialisedAsync } from "../database/authdb";
import knownCardsReducer from "../features/card/knownCardsSlice";
import bookReaderReducer from "../features/content/bookReaderSlice";
import simpleReaderReducer from "../features/content/simpleReaderSlice";
import videoReaderReducer from "../features/content/videoReaderSlice";
import definitionsReducer from "../features/definition/definitionsSlice";
import themeReducer from "../features/themes/themeReducer";
import uiReducer from "../features/ui/uiSlice";
import userSliceReducer, { doLogin, setAndSaveUser, throttledLogout } from "../features/user/userSlice";
import { ComponentsConfig } from "../lib/complexTypes";
import { ServiceWorkerProxy, setPlatformHelper } from "../lib/proxies";
import { ThemeName } from "../lib/types";
import SWDataProvider from "../ra-data-sw";
// import trackerRedux from "@openreplay/tracker-redux";

declare global {
  interface Window {
    // WARNING! For the momemnt this is REQUIRED for communication with D2Reader injectables
    componentsConfig: ComponentsConfig;
  }
}

export let tracker: Tracker;

export function setTracker(newTracker: Tracker) {
  tracker = newTracker;
}

// const openReplayMiddleware = tracker.use(
//   trackerRedux({
//     actionFilter: (action) => action.type !== "DRAW", // only actions which pass this test will be recorded
//     actionTransformer: (action) => (action.type === "LOGIN" ? null : action),
//     actionType: (action) => action.type, // action type for search, that's the default one
//     stateTransformer: (state) => {
//       const { jwt, ..._state } = state;
//       console.log("would try to send", jwt, _state);
//       return {};
//     },
//   }),
// );
export const ACCESS_TOKEN_PATH = "/api/v1/login/access-token";
export const REFRESH_TOKEN_PATH = "/api/v1/refresh";

interface CreateStoreProps {
  authProvider?: AuthProvider;
  dataProvider?: DataProvider;
  history?: History;
}

export let authProvider: AuthProvider | undefined;
export let dataProvider: DataProvider | undefined;
export let history: History | undefined;

let theme: ThemeName = "light";

if (typeof window !== "undefined") {
  if (!(window.chrome && chrome.runtime && chrome.runtime.id)) {
    const wb = new Workbox("/service-worker.js");
    wb.register({ immediate: true });
    history = createHashHistory();
    authProvider = jwtTokenAuthProvider();
    dataProvider = SWDataProvider({ wb: wb });
    theme = (localStorage.getItem("mode") as ThemeName) || "light";
    window.componentsConfig = {
      dataProvider: dataProvider,
      proxy: new ServiceWorkerProxy(wb),
      url: new URL(window.location.href),
    };
    setPlatformHelper(window.componentsConfig.proxy);
  }
}

const preloadedState = { theme };

function createStore({ authProvider, dataProvider, history }: CreateStoreProps) {
  const reducer = combineReducers({
    videoReader: videoReaderReducer,
    bookReader: bookReaderReducer,
    simpleReader: simpleReaderReducer,
    theme: themeReducer,
    knownCards: knownCardsReducer,
    definitions: definitionsReducer,
    ui: uiReducer,
    userData: userSliceReducer,
    ...(history && { admin: adminReducer, router: connectRouter(history) }),
  });
  const resettableAppReducer = (state: any, action: any) =>
    reducer(action.type !== USER_LOGOUT ? state : undefined, action);

  if (dataProvider && authProvider) {
    const saga = function* rootSaga() {
      yield all(
        [
          adminSaga(dataProvider, authProvider),
          // add your own sagas here
        ].map(fork),
      );
    };
    const sagaMiddleware = createSagaMiddleware();

    const store = configureStore({
      reducer: resettableAppReducer,
      middleware: (getDefaultMiddleware) =>
        // FIXME: react-admin seems to put binary files in redux, breaking best practices?
        getDefaultMiddleware({ serializableCheck: false }).concat([
          // contentConfigApi.middleware,
          // usersApi.middleware,
          sagaMiddleware,
          // openReplayMiddleware,
        ]),
      preloadedState,
      devTools: process.env.NODE_ENV !== "production",
    });

    sagaMiddleware.run(saga);
    return store;
  } else {
    const store = configureStore({
      reducer: resettableAppReducer,
      preloadedState,
      devTools: process.env.NODE_ENV !== "production",
    });
    return store;
  }
}

function jwtTokenAuthProvider(): AuthProvider {
  return {
    login: async ({ username, password }: { username: string; password: string }) => {
      const user = await doLogin(username, password, location.origin);
      if (user) {
        store.dispatch(
          setAndSaveUser({
            username,
            password,
            baseUrl: location.origin,
            error: false,
            success: true,
            user,
          }),
        );
        return Promise.resolve();
      } else {
        throw new Error("Unable to log in");
      }
    },
    logout: async () => {
      console.debug("throttledLogout action dispatched");
      store.dispatch(throttledLogout());

      return Promise.resolve();
    },
    checkAuth: async () => {
      const accessToken = store.getState().userData.user.accessToken || (await getUserDexie()).user.accessToken;
      return accessToken ? Promise.resolve() : Promise.reject();
    },
    checkError: async (error) => {
      // FIXME: this makes no sense here...
      console.error("Checking error", error);
      return Promise.resolve();
    },
    getPermissions: async () => {
      // FIXME: this is a bit of a hack... we don't really have permissions - if you have access etg is yours
      const username = store.getState().userData.username || (await getUserDexie()).username;
      if (!username || !(await isInitialisedAsync(username))) {
        return Promise.resolve([]);
      } else {
        return Promise.resolve(["initialised"]);
      }
    },
  };
}

function createHeadersFromOptions(options: fetchUtils.Options): Headers {
  const requestHeaders = (options.headers ||
    new Headers({
      Accept: "application/json",
    })) as Headers;
  if (
    !requestHeaders.has("Content-Type") &&
    !(options && (!options.method || options.method === "GET")) &&
    !(options && options.body && options.body instanceof FormData)
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (options.user && options.user.authenticated && options.user.token) {
    requestHeaders.set("Authorization", options.user.token);
  }
  return requestHeaders;
}

export async function getAxiosHeaders(): Promise<any> {
  const options = createOptionsFromJWTToken();
  const headers = createHeadersFromOptions(options);
  const axios: any = {};
  for (const [k, v] of headers) {
    axios[k] = v;
  }
  return axios;
}

function createOptionsFromJWTToken():
  | { user?: undefined }
  | {
      user: {
        authenticated: boolean;
        token: string;
      };
    } {
  const token = store.getState().userData.user.accessToken;
  if (!token) {
    return {};
  }
  return {
    user: {
      authenticated: true,
      token: "Bearer " + token,
    },
  };
}

export default createStore;
export const store = createStore({
  authProvider,
  dataProvider,
  history,
});

export type AdminStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
