import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import fetchBuilder from "fetch-retry";
import Cookies from "js-cookie";
import jwtDecode from "jwt-decode";
import type { RootState } from "../../app/createStore";
import { setUserDexie } from "../../database/authdb";
import { throttleAction } from "../../lib/funclib";
import { DEFAULT_RETRIES, DEFAULT_USER, INITIAL_USERSTATE, UserDetails, UserState } from "../../lib/types";
export const ACCESS_TOKEN_PATH = "/api/v1/login/access-token";
export const REFRESH_TOKEN_PATH = "/api/v1/refresh";
export const LOGOUT_PATH = "/api/v1/logout";

const modulePrefix = "user";

function userFromApiResult(result: any, username: string): UserDetails {
  const token_data = jwtDecode(result.access_token) as any;
  return {
    username,
    id: token_data.id,
    isAdmin: token_data.is_superuser,
    isTeacher: token_data.is_teacher,
    modelEnabled: token_data.model_enabled,
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    trackingKey: token_data.tracking_key,
    trackingEndpoint: token_data.tracking_endpoint,
    translationProviders: token_data.translation_providers,
    fromLang: token_data.lang_pair.split(":")[0],
    toLang: token_data.lang_pair.split(":")[1],
  };
}

const fetchRetry = fetchBuilder(fetch, {
  retries: DEFAULT_RETRIES,
  retryDelay: (attempt: number, error: Error | null, response: Response | null) => {
    return Math.pow(2, attempt) * 1000; // 1000, 2000, 4000
  },
  retryOn: function (attempt: number, error: Error | null, response: Response | null) {
    // retry on any network error, or 4xx or 5xx status codes
    if (attempt >= DEFAULT_RETRIES) {
      return false;
    }
    if (error !== null || (response && response.status >= 500)) {
      console.log(`Retrying, attempt number ${attempt + 1}`, response, error);
      return true;
    }
    return false;
  },
});

export async function doLogin(username: string, password: string, baseUrl: string): Promise<UserDetails> {
  const bodyFormData = new FormData();
  bodyFormData.append("username", username);
  bodyFormData.append("password", password);
  const res = await fetchRetry(baseUrl + ACCESS_TOKEN_PATH, {
    body: bodyFormData,
    method: "post",
  });
  return userFromApiResult(await res.json(), username);
}

const login = createAsyncThunk(`${modulePrefix}/login`, async (_, { getState }) => {
  const state = getState() as RootState;
  return await doLogin(state.userData.username, state.userData.password, state.userData.baseUrl);
});

const logout = createAsyncThunk(`${modulePrefix}/logout`, async (_, { getState }) => {
  // FIXME: do I really need this?
  const state = getState() as RootState;
  const res = await fetchRetry(state.userData.baseUrl + LOGOUT_PATH);
  return await res.json();
});

const refreshToken = createAsyncThunk(`${modulePrefix}/refreshToken`, async (_, { getState }) => {
  const state = getState() as RootState;
  let ret: UserDetails | null = null;
  if (state.userData.user?.refreshToken) {
    const res = await fetchRetry(state.userData.baseUrl + REFRESH_TOKEN_PATH, {
      body: JSON.stringify({ refresh: state.userData.user?.refreshToken }),
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      ret = userFromApiResult(await res.json(), state.userData.username);
    }
  }
  if (!ret) {
    ret = await doLogin(state.userData.username, state.userData.password, state.userData.baseUrl);
  }
  Cookies.set("refresh", ret.refreshToken);
  Cookies.set("session", ret.accessToken);
  return ret;
});

const THROTTLE_DELAY_MS = 5000;
export const throttledRefreshToken = throttleAction(refreshToken, THROTTLE_DELAY_MS, { trailing: false });
export const throttledLogin = throttleAction(login, THROTTLE_DELAY_MS, { trailing: false });
export const throttledLogout = throttleAction(logout, THROTTLE_DELAY_MS, { trailing: false });

export const userSlice = createSlice({
  name: "user",
  initialState: INITIAL_USERSTATE,
  reducers: {
    setAndSaveUser(state, action: PayloadAction<UserState>) {
      setUserDexie(action.payload);
      return action.payload;
    },
    setUser(state, action: PayloadAction<UserState>) {
      return action.payload;
    },
    updateUsername(state, action: PayloadAction<UserState["username"]>) {
      state.username = action.payload;
    },
    updatePassword(state, action: PayloadAction<UserState["password"]>) {
      state.password = action.payload;
    },
    updateBaseUrl(state, action: PayloadAction<UserState["baseUrl"]>) {
      state.baseUrl = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action: PayloadAction<UserDetails>) => {
        state.user = action.payload;
        state.success = true;
        state.error = false;
        setUserDexie({ ...state });
      })
      .addCase(login.rejected, (state) => {
        state.success = false;
        state.error = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = DEFAULT_USER;
        state.username = "";
        state.password = "";
        state.success = false;
        state.error = false;
        setUserDexie({ ...state, user: DEFAULT_USER });
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.user = action.payload;
        state.success = true;
        state.error = false;
        setUserDexie({ ...state });
      });
  },
});

export const { updateUsername, updatePassword, updateBaseUrl, setUser, setAndSaveUser } = userSlice.actions;

export default userSlice.reducer;
