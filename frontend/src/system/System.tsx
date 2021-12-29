import { ReactElement, useState } from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import { CardHeader, Typography } from "@material-ui/core";
import { useTranslate, Title, TopToolbar } from "react-admin";
import { useSelector, useDispatch } from "react-redux";

import { getUsername, setInitialisedAsync } from "../lib/JWTAuthProvider";
import { getDatabaseName, deleteDatabase } from "../database/Database";
import { AbstractWorkerProxy } from "../lib/proxies";
import HelpButton from "../components/HelpButton";
import { AppState, ThemeName } from "../lib/types";
import { changeTheme } from "./actions";

const useStyles = makeStyles({
  label: { width: "10em", display: "inline-block" },
  button: { margin: "1em" },
  toolbar: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
});

interface RefreshCacheButtonProps {
  onCacheEmptied: (message: string) => void;
}

function RefreshCacheButton({ onCacheEmptied }: RefreshCacheButtonProps): ReactElement {
  const classes = useStyles();

  function handleClick() {
    // WEBPUB_CACHE_NAME
    caches.keys().then(async (cacheNames) => {
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          await caches.delete(cacheName);
        }),
      );
      const message = `Cleared the following cached ${cacheNames.join(", ")}`;
      console.log(message);
      onCacheEmptied(message);
    });
  }
  return (
    <Button
      variant="contained"
      className={classes.button}
      // color={theme === 'dark' ? 'primary' : 'default'}
      color={"primary"}
      onClick={handleClick}
    >
      Refresh Caches (instant)
    </Button>
  );
}

interface RefreshDBButtonProps {
  onDBDeleted: (message: string) => void;
}

function RefreshDBButton({ onDBDeleted }: RefreshDBButtonProps): ReactElement {
  const classes = useStyles();

  async function handleClick() {
    const username = await getUsername();
    if (username) {
      const dbName = getDatabaseName({ url: new URL(window.location.href) }, username);
      deleteDatabase(dbName).then(async () => {
        const message = `Removed ${dbName}`;
        onDBDeleted(message);
        console.log(message);
        await setInitialisedAsync(username, false);
        window.location.href = "/";
      });
    }
  }
  return (
    <Button
      variant="contained"
      className={classes.button}
      // color={theme === 'dark' ? 'primary' : 'default'}
      color={"primary"}
      onClick={handleClick}
    >
      Reinstall DB (takes ~20 minutes!)
    </Button>
  );
}

interface ReinstallDBButtonProps {
  proxy: AbstractWorkerProxy;
}
function ReinstallDBButton({ proxy }: ReinstallDBButtonProps): ReactElement {
  const classes = useStyles();

  async function handleClick() {
    const username = await getUsername();
    if (username) {
      proxy
        .sendMessagePromise<string>({ source: "System", type: "resetDBConnections", value: "" })
        .then(() => {
          getUsername().then((username) => {
            if (username) {
              proxy.init(
                { username: username },
                () => {
                  return "";
                },
                () => {
                  return "";
                },
              );
            }
          });
        });
    } else {
      console.error("No username found");
    }
  }
  return (
    <Button
      variant="contained"
      className={classes.button}
      // color={theme === 'dark' ? 'primary' : 'default'}
      color={"primary"}
      onClick={handleClick}
    >
      Reload DB (almost instant)
    </Button>
  );
}

interface Props {
  proxy: AbstractWorkerProxy;
}

function System({ proxy }: Props): ReactElement {
  const translate = useTranslate();
  const [message, setMessage] = useState("");
  const classes = useStyles();
  const helpUrl = "https://transcrob.es/page/software/configure/system/";

  // const locale = useLocale();
  // const setLocale = useSetLocale();
  const theme = useSelector((state: AppState) => state.theme);
  const dispatch = useDispatch();

  function handleUpdate(mode: ThemeName) {
    localStorage.setItem("mode", mode); // a bit hacky, probably better somewhere else
    return dispatch(changeTheme(mode));
  }

  return (
    <div>
      <TopToolbar className={classes.toolbar}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <CardHeader title="Quick-fix actions" />
      <Card>
        <Title title={translate("pos.system")} />
        <CardContent>
          <div>
            <RefreshCacheButton onCacheEmptied={(message) => setMessage(message)} />
          </div>
          <div>
            <ReinstallDBButton proxy={proxy} />
          </div>
          <div>
            <RefreshDBButton onDBDeleted={(message) => setMessage(message)} />
          </div>
          <Typography>{message}</Typography>
        </CardContent>
      </Card>

      <CardHeader title="User preferences" />
      <Card>
        <Title title={translate("pos.configuration")} />
        <CardContent>
          <div className={classes.label}>{translate("pos.theme.name")}</div>
          <Button
            variant="contained"
            className={classes.button}
            color={theme === "light" ? "primary" : "default"}
            onClick={() => handleUpdate("light")}
          >
            {translate("pos.theme.light")}
          </Button>
          <Button
            variant="contained"
            className={classes.button}
            color={theme === "dark" ? "primary" : "default"}
            onClick={() => handleUpdate("dark")}
          >
            {translate("pos.theme.dark")}
          </Button>
        </CardContent>
        {/* no translations for now
            <CardContent>
                <div className={classes.label}>{translate('pos.language')}</div>
                <Button
                    variant="contained"
                    className={classes.button}
                    color={locale === 'en' ? 'primary' : 'default'}
                    onClick={() => setLocale('en')}
                >
                    en
                </Button>
                <Button
                    variant="contained"
                    className={classes.button}
                    color={locale === 'fr' ? 'primary' : 'default'}
                    onClick={() => setLocale('fr')}
                >
                    fr
                </Button>
            </CardContent> */}
      </Card>
    </div>
  );
}

export default System;
