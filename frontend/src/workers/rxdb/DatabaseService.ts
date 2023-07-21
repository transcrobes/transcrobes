import { getUserDexie } from "../../database/authdb";
import { CacheRefresh, ProgressCallbackMessage } from "../../lib/types";
import { DataService } from "../DataService";
import { getDb } from "./Database";
import { RxdbDataManager, rxdbDataManager, setDb } from "./rxdata";

export class DatabaseService extends DataService<RxdbDataManager> {
  constructor(
    progressCallback: (progress: ProgressCallbackMessage) => void,
    decacheCallback: (refresh: CacheRefresh) => void,
    reinitRxdb = false,
  ) {
    super(rxdbDataManager);
    this.chain = this.#initialize(progressCallback, decacheCallback, reinitRxdb);
  }

  async #initialize(
    progressCallback: (progress: ProgressCallbackMessage) => void,
    decacheCallback?: (refresh: CacheRefresh) => void,
    reinitRxdb = false,
  ) {
    const userData = await getUserDexie();
    if (!userData?.user?.accessToken && !userData?.user?.username) {
      console.debug("No user data found, skipping rxdb init");
      return;
    }
    const ldb = await getDb(
      { url: new URL(userData.baseUrl), username: userData.user.username },
      progressCallback,
      decacheCallback,
      reinitRxdb,
    );
    console.log("Got the initialised rxdb", ldb);
    setDb(ldb);
    progressCallback({ source: "RXDBDS", isFinished: true, message: { phrase: "rxdb.webworker.loaded" } });
  }
}
