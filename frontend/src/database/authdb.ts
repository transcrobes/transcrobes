import Dexie from "dexie";
import _ from "lodash";
import { INITIAL_USERSTATE, UserState } from "../lib/types";

const DB_NAME = "auth";
const COLLECTION_NAME = "auth";
export const db = new Dexie(DB_NAME);

db.version(1).stores({
  [COLLECTION_NAME]: "key",
});

export async function getUserDexie(): Promise<UserState> {
  const val = await db.table(COLLECTION_NAME).where("key").equals("user").first();
  // _.merge ensures we can add values and code that uses user objects will always be valid
  return _.merge(_.cloneDeep(INITIAL_USERSTATE), val?.value);
}

export async function setUserDexie(user: UserState): Promise<void> {
  await db.table(COLLECTION_NAME).put({ key: "user", value: user });
}

export async function getValue(key: string): Promise<string | null | undefined> {
  const val = await db.table(COLLECTION_NAME).where("key").equals(key).first();
  return val == null ? val : (val["value"] as string);
}

export async function setValue(key: string, value: string): Promise<void> {
  await db.table(COLLECTION_NAME).put({ key: key, value: value });
}

export async function deleteValue(key: string): Promise<void> {
  await db.table(COLLECTION_NAME).where("key").equals(key).delete();
}

export async function isInitialisedAsync(username: string): Promise<boolean> {
  return (await getValue("initialised:" + username)) === "true";
}
export async function setInitialisedAsync(username: string, value = true): Promise<void> {
  await setValue("initialised:" + username, value ? "true" : "false");
}
