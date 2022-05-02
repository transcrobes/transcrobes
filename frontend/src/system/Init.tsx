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

const helpUrl = "https://transcrob.es";
function Intro() {
  const translate = useTranslate();
  return (
    <>
      <h1>Welcome to Transcrobes!</h1>
      <h2>It's initialisation time (3-10 minutes)!</h2>
      <div>
        <Typography>
          <a target={"_blank"} href={helpUrl}>
            {translate("user.help.site")}
          </a>
        </Typography>
      </div>

      <p>
        Transcrobes has been tested and works best on either Google Chrome, Microsoft Edge or Yandex Browser
        (Chromium-based browsers) on either the desktop (Windows, Linux, Mac) or on Android. Unfortunately, other
        browsers (including everything on iOS) don't properly support all the latest web standards, so some things might
        not work properly. We are working hard on bringing compatibility to all platforms.
      </p>
      <p>
        Even though Transcrobes is entirely browser-based, a lot of Transcrobes' functionality is available offline
        (it's a{" "}
        <a target="_blank" rel="noopener noreferrer" href="https://web.dev/progressive-web-apps/">
          "Progressive Web App"
        </a>
        ), which means you can keep reading your favourite books, watching your favourite movies or doing active
        learning exercises wherever you are, whenever you want. On a mountain or behind a Great Big Firewall, nothing
        should get in the way of your learning! This does mean that the system needs to download and prepare some
        things, and that is going to take a while (10-20 minutes depending on how fast your phone/tablet/computer is).
      </p>
      <p>
        The system needs to do quite a lot of work (mainly building indexeddb indexes), so don't be alarmed if your
        devices heat up a bit (should be less than a gaming session though!) and the fan switches on. It's normal, and
        will only happen once, at initialisation time. It's better to not interrupt the initialisation while it's
        happening (like any initialisation!), so make sure your device has plenty of battery (or is plugged in). It will
        also download 25-50MB of data so if you are not on wifi, make sure that is not a problem for your data plan.
      </p>
    </>
  );
}

interface RunningMessageProps {
  message: string;
}

function RunningMessage({ message }: RunningMessageProps): ReactElement {
  return (
    <div id="initialising">
      <h1 className="h4 text-gray-900 mb-4">Initialisation started</h1>
      <p>
        Please be patient while the initialisation finishes. The initialisation will give some updates but you should
        not be worried unless you see no update for over 5 minutes. No harm should come if you stop the initialisation
        by navigating away or closing the browser. The initialisation will pick up where it left off when you return.
      </p>
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
    <div>
      <Card>
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
              {translate("resources.system.initialise")}
            </Button>
          )}
          {runStarted && (
            <>
              <RunningMessage message={message} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Init;
