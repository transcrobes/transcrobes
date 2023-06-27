import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import NoSleep from "nosleep.js";
import { ReactElement, useEffect, useState } from "react";
import { Title, useAuthenticated, useLocaleState, useTranslate } from "react-admin";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import Loading from "../components/Loading";
import { isInitialisedAsync, setInitialisedAsync } from "../database/authdb";
import { setLoading } from "../features/ui/uiSlice";
import { AbstractWorkerProxy, ProgressCallbackMessage } from "../lib/proxies";
import { SystemLanguage } from "../lib/types";

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

let progress = 0;

interface Props {
  proxy: AbstractWorkerProxy;
}

function Init({ proxy }: Props): ReactElement {
  useAuthenticated(); // redirects to login if not authenticated, required because shown as RouteWithoutLayout
  const translate = useTranslate();
  const [runStarted, setRunStarted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isInited, setIsInited] = useState(false);
  const [locale] = useLocaleState() as [SystemLanguage, (locale: SystemLanguage) => void];

  if (progress === 0) progress = window.setTimeout(progressUpdate, 5000);

  const username = useAppSelector((state) => state.userData.username);
  const dispatch = useAppDispatch();

  // WARNING! DO NOT DELETE THIS!
  // On mobile, unless there is constant communication between the page and the SW, the browser
  // will simply kill the SW to save battery, no matter how busy the SW is.
  function progressUpdate() {
    progress = 0;
    if (username) {
      isInitialisedAsync(username).then((inited) => {
        if (!inited && location.href.endsWith("/#/init")) {
          proxy.sendMessage({ source: "tmp-test", type: "heartbeat", value: "" }, (datetime) => {
            console.log("Heartbeat", datetime.toString());
            if (progress === 0) progress = window.setTimeout(progressUpdate, 5000);
            return "";
          });
        }
      });
    }
  }

  function initialise(): void {
    noSleep.enable();
    setRunStarted(true);
    dispatch(setLoading(true));

    function progressCallback(progress: ProgressCallbackMessage): string {
      console.log("progressCallback", progress);
      if (progress.message.phrase === "RESTART_BROWSER") {
        setMessage("You must completely close all browser instances and then restart the initialisation!");
        throw new Error("Browser restart required");
      } else setMessage(translate(progress.message.phrase, progress.message.options));
      return "";
    }
    function finishedCallback(message: string): string {
      console.log("Initialisation Complete!", message);
      noSleep.disable();
      dispatch(setLoading(undefined));

      // FIXME: NASTINESS!!!
      if (username) {
        setInitialisedAsync(username).then(() => {
          dispatch(setLoading(undefined));
          // clear the caches so that the existing user data is loaded
          navigator.serviceWorker.getRegistration().then((reg) => {
            reg?.unregister().then((res) => {
              console.log("Unregistering SW after install", res);
              window.location.reload();
            });
          });
        });
      } else {
        throw new Error("Unable to find username");
      }
      return "";
    }
    if (!username) {
      throw new Error("Unable to find username");
    }
    proxy.init({ username }, finishedCallback, progressCallback, true);
  }
  useEffect(() => {
    if (username) {
      isInitialisedAsync(username).then((inited) => {
        setIsInited(inited);
      });
    }
  }, [username]);
  useEffect(() => {
    if (isInited) {
      if (location.href.endsWith("/#/init")) {
        // FIXME: NASTINESS!!! this can't be done here and awaited because it takes FAR too long (rxdb 14.12.1, 20+ minutes on Android)
        // dispatch(setLoading(true));
        // proxy.sendMessagePromise({
        //   source: "App",
        //   type: "forceDefinitionsInitialSync",
        // })
        // .then(() => {
        //   window.location.href = "/";
        // });
        window.location.href = "/";
      }
    }
  }, [isInited]);
  return (
    <Card
      sx={{
        paddingTop: "3em",
      }}
    >
      <Title title={translate("screens.main.system")} />
      <CardContent>
        <Typography sx={{ paddingBottom: "1em" }} variant="h4">
          {translate("screens.extension.initialisation.title")}
        </Typography>
        {runStarted === null && !isInited && (
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
      {isInited && <Loading position="relative" top="0px" message={translate("screens.main.finishing")} />}
    </Card>
  );
}

export default Init;
