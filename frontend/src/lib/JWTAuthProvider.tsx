import { AuthProvider, fetchUtils } from "ra-core";
import Dexie from "dexie";
import { HttpError } from "react-admin";
import { parseJwt } from "./funclib";

export const ACCESS_TOKEN_PATH = "/api/v1/login/access-token";
export const REFRESH_TOKEN_PATH = "/api/v1/refresh";

const db = new Dexie("auth");
db.version(1).stores({
  auth: "key",
});

export interface Options {
  obtainAuthTokenUrl?: string;
}

export function authDb(): Dexie {
  return db;
}

export async function getValue(key: string): Promise<string | null | undefined> {
  const val = await db.table("auth").where("key").equals(key).first();
  return val == null ? val : (val["value"] as string);
}

export async function setValue(key: string, value: string): Promise<void> {
  await db.table("auth").put({ key: key, value: value });
}

export async function getUsername(): Promise<string | null | undefined> {
  return await getValue("username");
}
export async function getPassword(): Promise<string | null | undefined> {
  return await getValue("password");
}
export async function getRefresh(): Promise<string | null | undefined> {
  return await getValue("refresh");
}
export async function getAccess(): Promise<string | null | undefined> {
  return await getValue("access");
}
export async function setRefresh(refreshToken: string): Promise<void> {
  await setValue("refresh", refreshToken);
}
export async function setAccess(accessToken: string): Promise<void> {
  await setValue("access", accessToken);
}
export async function setUsername(username: string): Promise<void> {
  await setValue("username", username);
}
export async function setPassword(password: string): Promise<void> {
  await setValue("password", password);
}

export function isInitialised(): boolean {
  return localStorage.getItem("initialised") === "true";
}
export function setInitialised(value = true): void {
  localStorage.setItem("initialised", value ? "true" : "false");
}

function jwtTokenAuthProvider(options: Options = {}): AuthProvider {
  const opts = {
    obtainAuthTokenUrl: ACCESS_TOKEN_PATH,
    ...options,
  };
  return {
    login: async ({ username, password }) => {
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const request = new Request(opts.obtainAuthTokenUrl, {
        method: "POST",
        body: params,
      });
      const response = await fetch(request);
      if (response.ok) {
        const responseJSON = await response.json();
        await db.table("auth").put({ key: "username", value: username });
        await db.table("auth").put({ key: "password", value: password });
        await db.table("auth").put({ key: "access", value: responseJSON.access_token });
        await db.table("auth").put({ key: "refresh", value: responseJSON.refresh_token });
        await db
          .table("auth")
          .put({ key: "lang_pair", value: parseJwt(responseJSON.access_token).lang_pair });
        return;
      }
      if (response.headers.get("content-type") !== "application/json") {
        console.error("Error logging in", response);
        throw new Error(response.statusText);
      }

      const json = await response.json();
      const error = json.non_field_errors;
      throw new Error(error || response.statusText);
    },
    logout: async () => {
      await db
        .table("auth")
        .where("key")
        .anyOf("access", "refresh", "username", "password")
        .delete();
      return Promise.resolve();
    },
    checkAuth: async () => {
      const access = await db.table("auth").where("key").equals("access").first();
      return access ? Promise.resolve() : Promise.reject();
    },
    checkError: async (error) => {
      // FIXME: this makes no sense here...
      const status = error.status;
      if (status === 401 || status === 403) {
        await db.table("auth").where("key").anyOf("access", "refresh").delete();
        return Promise.reject();
      }
      return Promise.resolve();
    },
    getPermissions: async () => {
      // FIXME: this is a bit of a hack... we don't really have permissions - if you have access etg is yours
      return (await isInitialised()) ? Promise.resolve(["initialised"]) : Promise.resolve([]);
    },
  };
}

export const createHeadersFromOptions = (options: fetchUtils.Options): Headers => {
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
  } else {
    console.error("For some reason not here", options);
  }
  return requestHeaders;
};

// FIXME: can we do better than any?
export async function getAxiosHeaders(): Promise<any> {
  const options = await createOptionsFromJWTToken();
  const headers = createHeadersFromOptions(options);
  const axios: any = {};
  for (const [k, v] of headers) {
    axios[k] = v;
  }
  return axios;
}

export async function createOptionsFromJWTToken(): Promise<
  | {
      user?: undefined;
    }
  | {
      user: {
        authenticated: boolean;
        token: string;
      };
    }
> {
  const token = await getAccess();
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

export async function fetchJson(url: string, options: fetchUtils.Options = {}): Promise<any> {
  const requestHeaders = createHeadersFromOptions(options);

  return fetch(url, { ...options, headers: requestHeaders })
    .then((response) =>
      response.text().then((text) => ({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: text,
      })),
    )
    .then(({ status, statusText, headers, body }) => {
      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        // not json, no big deal
      }
      if (status < 200 || status >= 300) {
        return Promise.reject(new HttpError((json && json.message) || statusText, status, json));
      }
      return Promise.resolve({ status, headers, body, json });
    });
}

// eslint-disable-next-line @typescript-eslint/ban-types
export async function fetchJsonWithAuthJWTToken(url: string, options: object): Promise<any> {
  let fetchOptions = Object.assign(await createOptionsFromJWTToken(), options);

  if ("body" in options) {
    (fetchOptions as fetchUtils.Options).body = JSON.stringify(
      (fetchOptions as fetchUtils.Options).body,
    );
    fetchOptions = { ...fetchOptions, ...{ method: "POST" } };
  }
  return fetchJson(url, fetchOptions);
}

export async function refreshAccessToken(url: URL): Promise<void> {
  const refreshToken = await getRefresh();
  const reAuthUrl = new URL(REFRESH_TOKEN_PATH, url.origin).href;
  const fetchInfo: RequestInit = {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify({ refresh: refreshToken }),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  };
  const res = await fetch(reAuthUrl, fetchInfo);
  if (res.ok && res.status === 200) {
    const json = await res.json();
    await setAccess(json.access || json.access_token);
    const newRefresh = json.refresh || json.refresh_token;
    if (newRefresh) {
      await setRefresh(newRefresh);
    }
    return;
  } else if (res.status === 401 || res.status === 403 || res.status === 422) {
    // the refresh token is not valid
    await db.table("auth").where("key").anyOf("access", "refresh").delete();
    const password = await getPassword();
    const username = await getUsername();
    if (username && password) {
      // raises if unsuccessful
      await jwtTokenAuthProvider({
        obtainAuthTokenUrl: new URL(ACCESS_TOKEN_PATH, url.origin).href,
      }).login({ username: username, password: password });
      return;
    }
    console.error(
      "I don't have either the username or password, so can't refresh creds for user",
      username,
    );
  }
  throw new Error("Impossible to refresh credentials");
}

export default jwtTokenAuthProvider;
