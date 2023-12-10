import type { BackgroundWorkerManager, BackgroundWorkerTabManager } from "../extension/backgroundfn";
import type { PublicationConfig } from "../lib/types";
import type { RxdbDataManager } from "../workers/rxdb/rxdata";
import type { SqliteDataManager } from "../workers/sqlite/sqldata";

export type GenericMessage = { source: string; value?: any };

export type OnlineManager = {
  sentenceTranslation: (text) => Promise<string>;
  precachePublications: (publications: PublicationConfig[]) => Promise<void>;
};

export type DataManager = RxdbDataManager & SqliteDataManager;
export type ServiceWorkerManager = OnlineManager;
export type OnlineDataManager = DataManager & OnlineManager;
export type ServiceWorkerDataManager = OnlineDataManager & ServiceWorkerManager;
export type WebDataManager = OnlineDataManager;
export type ExtDataManager = OnlineDataManager & BackgroundWorkerManager & BackgroundWorkerTabManager;
