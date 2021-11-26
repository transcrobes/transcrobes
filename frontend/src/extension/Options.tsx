import { useEffect, useState } from "react";
import * as utils from "../lib/lib";
import "./options.css";
import * as ap from "../lib/JWTAuthProvider";
import { getDb } from "../database/Database";
import { RxDBDataProviderParams } from "../ra-data-rxdb";
import Loader from "../img/loader.gif";
import { USER_STATS_MODE } from "../lib/lib";
import { TranscrobesDatabase } from "../database/Schema";
import { onError } from "../lib/funclib";

declare global {
  interface Window {
    tcb: TranscrobesDatabase;
  }
}

function Status({ message }: { message: string }) {
  return <div id="status">{message}</div>;
}
function Initialisation() {
  return (
    <div>
      <div>
        <h1>Initialisation started</h1>
        <p>
          Please be patient while the initialisation finishes. The initialisation will give some
          updates but you should not be worried unless you see no update for over 5 minutes. No harm
          should come if you stop the initialisation by navigating away or closing the browser. The
          initialisation will pick up where it left off when you return.
        </p>
      </div>
    </div>
  );
}
function Intro({ inited }: { inited: boolean }) {
  return (
    <div>
      <div>
        {!inited && <h1>Welcome! It's Transcrobes initialisation time!</h1>}
        {inited && <h1>Reinitialise Transcrobes or update settings</h1>}
        <p>
          Even though the client side of Transcrobes is entirely browser-based, a lot of
          Transcrobes' data needs to be downloaded in order to save on bandwidth and dramatically
          improve performance, and that is going to take a while (15-25 minutes, depending on how
          fast your phone/tablet/computer is).
        </p>
        <p>
          The system needs to do quite a lot of work (mainly building indexeddb indexes), so don't
          be alarmed if your devices heat up a bit (should be less than a gaming session though!)
          and the fan switches on. It's normal, and will only happen once, at initialisation time.
          It's better to not interrupt the initialisation while it's happening (like any
          initialisation!), so make sure your device has plenty of battery (or is plugged in). On an
          Android device you should plug it in to avoid the system "optimising" and halting
          installation. It will also download 25-50MB of data so if you are not on wifi, make sure
          that is not a problem for your data plan.
        </p>
      </div>
    </div>
  );
}
export default function Options(): JSX.Element {
  const [inited, setInited] = useState<boolean | null>(null);
  const [running, setRunning] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [glossing, setGlossing] = useState(USER_STATS_MODE.L1);

  useEffect(() => {
    (async () => {
      const user = await ap.getUsername();
      if (user) {
        setUsername(user);
        const ined = await ap.isInitialisedAsync(user);
        setInited(ined);
      }
      const pwd = await ap.getPassword();
      if (pwd) setPassword(pwd);
      const bUrl = await ap.getValue("baseUrl");
      if (bUrl) setBaseUrl(bUrl);
      const gl = await ap.getValue("glossing");
      if (gl) setGlossing(parseInt(gl));
      else setGlossing(USER_STATS_MODE.L1);
    })();
  }, []);

  async function saveFields() {
    utils.setUsername(username);
    utils.setPassword(password);
    utils.setBaseUrl(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
    utils.setGlossing(glossing);

    await Promise.all([
      ap.setUsername(utils.username),
      ap.setPassword(utils.password),
      ap.setValue("baseUrl", utils.baseUrl),
      ap.setValue("glossing", utils.glossing.toString()),
    ]);
    setMessage("Options saved.");
    await ap.refreshAccessToken(new URL(utils.baseUrl));
    const items = await Promise.all([ap.getAccess(), ap.getRefresh()]);
    if (!(items[0] && items[1])) {
      throw new Error("Unable to get tokens");
    }
    utils.setAccessToken(items[0]);
    utils.setRefreshToken(items[1]);
  }

  async function handleSubmit(forceReinit: boolean) {
    await saveFields();

    setRunning(true);

    if (!utils.accessToken) {
      setMessage(
        "There was an error starting the initial synchronisation. Please try again in a short while.",
      );
      onError("Something bad happened, couldnt get an accessToken to start a syncDB()");
    } else {
      setMessage("");
      const dbConfig: RxDBDataProviderParams = { url: new URL(utils.baseUrl) };

      const progressCallback = (message: string) => {
        console.debug("progressCallback in options.ts", message);
        setMessage(message);
      };
      const db = await getDb(dbConfig, progressCallback, !!inited && forceReinit);
      try {
        window.tcb = db;
        setMessage("Initialisation Complete!");
        await ap.setInitialisedAsync(utils.username);
        console.debug("Synchronisation finished!");
      } catch (err: any) {
        setMessage(`There was an error setting up Transcrobes.
              Please try again in a little while, or contact Transcrobes support (<a href="https://transcrob.es/page/contact/">here</a>)`);
        console.log("getDb() threw an error in options.ts");
        console.dir(err);
        console.error(err);
      }
    }
  }

  return (
    <>
      <div className="credentials">
        <div className="title">Transcrobes Server connection information</div>
        <div className="frow">
          <label htmlFor="username">Username:</label>{" "}
          <input
            id="username"
            value={username}
            type="text"
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
        </div>
        <div className="frow">
          <label htmlFor="password">Password:</label>{" "}
          <input
            id="password"
            value={password}
            type="password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </div>
        <div className="frow">
          <label htmlFor="base-url">Base URL:</label>{" "}
          <input
            id="base-url"
            value={baseUrl}
            type="url"
            onChange={(e) => {
              setBaseUrl(e.target.value);
            }}
          />
        </div>
        <div className="frow">
          {" "}
          <label htmlFor="glossing">Glossing:</label>
          <select
            name="glossing"
            value={glossing}
            id="glossing"
            onChange={(e) => {
              setGlossing(parseInt(e.target.value));
            }}
          >
            <option value={USER_STATS_MODE.UNMODIFIED}>None</option>
            <option value={USER_STATS_MODE.L2_SIMPLIFIED}>Simple word</option>
            <option value={USER_STATS_MODE.TRANSLITERATION}>Pinyin</option>
            <option value={USER_STATS_MODE.L1}>English</option>
          </select>
        </div>
        <div className="savestyle">
          <button onClick={() => handleSubmit(false)}>Save</button>
        </div>
        {inited && (
          <div className="savestyle">
            <button onClick={() => handleSubmit(true)}>Force reinitialisation</button>
          </div>
        )}
      </div>
      <Intro inited={!!inited} />
      {running && <img alt="Running" src={Loader} /> && <Initialisation />}
      <Status message={message} />
    </>
  );
}
