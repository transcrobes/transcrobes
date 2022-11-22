import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import NoSleep from "nosleep.js";
import { ReactElement, useState } from "react";
import { Title, useAuthenticated, useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import Loading from "../components/Loading";
import { isInitialisedAsync, setInitialisedAsync } from "../database/authdb";
import { setLoading } from "../features/ui/uiSlice";
import { AbstractWorkerProxy, ProgressCallbackMessage } from "../lib/proxies";

const noSleep = new NoSleep();

const useStyles = makeStyles()({
  label: { width: "10em", display: "inline-block" },
  button: { margin: "1em" },
});

function Intro() {
  const translate = useTranslate();
  return (
    <>
      <Typography sx={{ paddingBottom: "1em" }} variant="h4">
        {translate("screens.extension.initialisation.title")}
      </Typography>
      <Typography sx={{ paddingBottom: "1em" }}>{translate("screens.initialisation.intro_a")}</Typography>
      <Typography sx={{ paddingBottom: "1em" }}>{translate("screens.initialisation.intro_b")}</Typography>
      <Typography sx={{ paddingBottom: "1em" }}>{translate("screens.initialisation.intro_c")}</Typography>
    </>
  );
}

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
      <div className="text-center" style={{ fontSize: "2em", color: "black" }} id="initialisationMessages">
        {message}
      </div>
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
  const { classes } = useStyles();
  const [runStarted, setRunStarted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");

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
      if (progress.message === "RESTART_BROWSER") {
        setMessage("You must completely close all browser instances and then restart the initialisation!");
        throw new Error("Browser restart required");
      } else setMessage(progress.message);
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
              window.location.href = "/";
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

  return (
    <Card
      sx={{
        paddingTop: "3em",
      }}
    >
      <Title title={translate("pos.system")} />
      <CardContent>
        <Intro />
        {runStarted === null && (
          <Button
            variant="contained"
            className={classes.button}
            color={"primary"}
            size={"large"}
            onClick={() => initialise()}
          >
            {translate("screens.system.initialise")}
          </Button>
        )}
        {runStarted && (
          <>
            <RunningMessage message={message} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default Init;
