import Dexie from "dexie";
import { APPLICATION_NAMES, TCApplication } from "./types";

const DB_NAME = "settings";
const db = new Dexie(DB_NAME);

db.version(1).stores(APPLICATION_NAMES.reduce((a, v) => ({ ...a, [v]: "key" }), {}));

export async function getSettingsValue(app: TCApplication, key: string): Promise<string | null | undefined> {
  const val = await db.table(app).where("key").equals(key).first();
  return val == null ? val : (val["value"] as string);
}

export async function setSettingsValue(app: TCApplication, key: string, value: string): Promise<void> {
  await db.table(app).put({ key: key, value: value });
}

export async function deleteSettingsValue(app: TCApplication, key: string): Promise<void> {
  await db.table(app).where("key").equals(key).delete();
}
