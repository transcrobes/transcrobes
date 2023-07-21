import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import NoSleep from "nosleep.js";
import { ReactElement, useEffect, useState } from "react";
import { Title, useAuthenticated, useTranslate } from "react-admin";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import Loading from "../components/Loading";
import { setInitialisedAsync } from "../database/authdb";
import { setLoading } from "../features/ui/uiSlice";
import { DATA_SOURCE as RXDB_DATA_SOURCE } from "../workers/rxdb/install-worker";
import { DATA_SOURCE as SQLITE_DATA_SOURCE } from "../workers/sqlite/install-worker";
import { ProgressCallbackMessage } from "../lib/types";

const noSleep = new NoSleep();

interface RunningMessageProps {
  message: string;
}

function RunningMessage({ message }: RunningMessageProps): ReactElement {
  const translate = useTranslate();
  return (
    <div id="initialising">
      <Typography variant="h4">{translate("screens.initialisation.started")}</Typography>
      <Typography>{translate("screens.initialisation.started_message")}</Typography>
      <Loading position="relative" top="0px" />
      <Box sx={{ textAlign: "center", fontSize: "2em" }} id="initialisationMessages">
        {message}
      </Box>
    </div>
  );
}

function Init(): ReactElement {
  useAuthenticated(); // redirects to login if not authenticated, required because shown as RouteWithoutLayout
  const translate = useTranslate();
  const [runStarted, setRunStarted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isRxdbInited, setIsRxdbInited] = useState(false);
  const [isSqliteInited, setIsSqliteInited] = useState(false);
  const [rxdbInstallWorker, setRxdbInstallWorker] = useState<Worker | null>(null);
  const [sqliteInstallWorker, setSqliteInstallWorker] = useState<Worker | null>(null);

  const userData = useAppSelector((state) => state.userData);
  const dispatch = useAppDispatch();
  function finishedCallback() {
    console.log("Initialisation Complete!");
    noSleep.disable();
    dispatch(setLoading(undefined));
    setInitialisedAsync(userData.username).then(() => {
      window.location.href = "/";
    });
  }

  async function initialise() {
    noSleep.enable();
    setRunStarted(true);
    dispatch(setLoading(true));

    function progressCallback({ message, isFinished }: ProgressCallbackMessage) {
      console.log("progressCallback", message, isFinished);
      if (message.phrase === "RESTART_BROWSER") {
        setMessage("You must completely close all browser instances and then restart the initialisation!");
        throw new Error("Browser restart required");
      } else setMessage(translate(message.phrase, message.options));
    }
    if (!userData.username) {
      throw new Error("Unable to find username");
    }
    const messageListener = (event: MessageEvent<any>) => {
      const message = event.data;
      console.log("message", message);
      if (message.type === "progress") {
        progressCallback(message.value);
      } else if (message.type === "finished") {
        if (message.source === SQLITE_DATA_SOURCE) {
          console.log("Got finished from sqliteInstallWorker");
          setIsSqliteInited(true);
          sqliteInstallWorker?.terminate();
        } else if (message.source === RXDB_DATA_SOURCE) {
          console.log("Got finished from rxdbInstallWorker");
          setIsRxdbInited(true);
          rxdbInstallWorker?.terminate();
        }
      }
    };
    const initObject = { source: "INIT", type: "install", value: userData };
    const sqlite = new Worker(new URL("../workers/sqlite/install-worker.ts", import.meta.url), {
      type: "module",
    });
    sqlite.addEventListener("message", messageListener);
    sqlite.postMessage(initObject);
    setSqliteInstallWorker(sqlite);

    const rxdb = new Worker(new URL("../workers/rxdb/install-worker.ts", import.meta.url), {
      type: "module",
    });
    rxdb.addEventListener("message", messageListener);
    rxdb.postMessage(initObject);
    setRxdbInstallWorker(rxdb);
  }
  useEffect(() => {
    if (isRxdbInited && isSqliteInited) {
      finishedCallback();
    }
  }, [isRxdbInited, isSqliteInited]);
  return (
    <Card sx={{ paddingTop: "3em" }}>
      <Title title={translate("screens.main.system")} />
      <CardContent>
        <Typography sx={{ paddingBottom: "1em" }} variant="h4">
          {translate("screens.extension.initialisation.title")}
        </Typography>
        {runStarted === null && (
          <Button
            variant="contained"
            sx={{ margin: "1em" }}
            color={"primary"}
            size={"large"}
            onClick={() => initialise()}
          >
            {translate("screens.system.initialise")}
          </Button>
        )}
        <Typography sx={{ paddingBottom: "1em" }}>{translate("screens.initialisation.intro")}</Typography>
        {runStarted && <RunningMessage message={message} />}
      </CardContent>
    </Card>
  );
}

export default Init;
