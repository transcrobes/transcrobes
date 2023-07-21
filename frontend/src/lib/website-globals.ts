import type { History } from "history";
import type { AuthProvider, DataProvider } from "react-admin";

export let authProvider: AuthProvider | undefined;
export let dataProvider: DataProvider | undefined;
export let history: History | undefined;

export function setAuthProvider(ap: AuthProvider) {
  authProvider = ap;
}
export function setDataProvider(dp: DataProvider) {
  dataProvider = dp;
}
export function setHistory(h: History) {
  history = h;
}
