import Dexie from "dexie";

const DB_NAME = "ModelsCache";
const db = new Dexie(DB_NAME);
const tableName = "models";
db.version(1).stores({ [tableName]: "key" });

export type ModelCache = {
  cachedDate: number;
  value: string;
};

export async function getCacheValue(key: string): Promise<ModelCache | null | undefined> {
  const val = await db.table(tableName).where("key").equals(key).first();
  return val == null ? val : (val["value"] as string);
}

export async function setCacheValue(key: string, value: ModelCache): Promise<void> {
  await db.table(tableName).put({ key: key, value: value });
}

export async function cleanCache(): Promise<void> {
  const now = Date.now();
  const old = now - 1000 * 60 * 60 * 24 * 30; // 30 days
  const nbDeleted = await db
    .table(tableName)
    .filter((model) => model.cachedDate < old)
    .delete();
  console.debug(`Cleaned ${nbDeleted} old cache values`);
}
