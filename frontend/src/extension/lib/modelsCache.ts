import Dexie from "dexie";

const DB_NAME = "ModelsCache";
const tableName = "models";
let db: Dexie;

function getDb() {
  if (!db) {
    db = new Dexie(DB_NAME);
    db.version(1).stores({ [tableName]: "key" });
  }
  return db;
}

export type ModelCache = {
  cachedDate: number;
  value: string;
};

export async function getCacheValue(key: string): Promise<ModelCache | null | undefined> {
  const val = await getDb().table(tableName).where("key").equals(key).first();
  return val == null ? val : (val["value"] as string);
}

export async function setCacheValue(key: string, value: ModelCache): Promise<void> {
  await getDb().table(tableName).put({ key: key, value: value });
}

export async function cleanCache(): Promise<void> {
  const now = Date.now();
  const old = now - 1000 * 60 * 60 * 24 * 30; // 30 days
  const nbDeleted = await getDb()
    .table(tableName)
    .filter((model) => model.cachedDate < old)
    .delete();
  console.debug(`Cleaned ${nbDeleted} old cache values`);
}
