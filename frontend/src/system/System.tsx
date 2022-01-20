import { ReactElement, useState } from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import { CardHeader, Typography } from "@material-ui/core";
import { useTranslate, Title, TopToolbar } from "react-admin";

import { getDatabaseName, deleteDatabase } from "../database/Database";
import { AbstractWorkerProxy } from "../lib/proxies";
import HelpButton from "../components/HelpButton";
import { ThemeName } from "../lib/types";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { setInitialisedAsync } from "../database/authdb";
import { changeTheme } from "../features/themes/themeReducer";

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
    <Button variant="contained" className={classes.button} color={"primary"} onClick={handleClick}>
      Refresh Caches (instant)
    </Button>
  );
}

interface ReinstallDBButtonProps {
  proxy: AbstractWorkerProxy;
  onDBDeleted: (message: string) => void;
}

function ReinstallDBButton({ proxy, onDBDeleted }: ReinstallDBButtonProps): ReactElement {
  const classes = useStyles();
  const username = useAppSelector((state) => state.userData.username);

  async function handleClick() {
    if (username) {
      const dbName = getDatabaseName({ url: new URL(window.location.href), username });
      await proxy.sendMessagePromise<string>({
        source: "System",
        type: "resetDBConnections",
        value: "",
      });
      await setInitialisedAsync(username, false);
      // FIXME: should probably have this done in the SW, not here... ideally there should
      // be no refs to data.ts in the UI AT ALL
      await deleteDatabase(dbName);
      const message = `Removed ${dbName}`;
      onDBDeleted(message);
      console.log(message);
      window.location.href = "/";
    }
  }
  return (
    <Button variant="contained" className={classes.button} color={"primary"} onClick={handleClick}>
      Reinstall DB (takes ~20 minutes!)
    </Button>
  );
}

interface ReloadDBButtonProps {
  proxy: AbstractWorkerProxy;
}
function ReloadDBButton({ proxy }: ReloadDBButtonProps): ReactElement {
  const classes = useStyles();

  async function handleClick() {
    const username = useAppSelector((state) => state.userData.username);
    if (username) {
      await proxy.sendMessagePromise<string>({ source: "System", type: "resetDBConnections", value: "" });
      await proxy.asyncInit({ username: username });
    } else {
      console.error("No username found");
    }
  }
  return (
    <Button variant="contained" className={classes.button} color={"primary"} onClick={handleClick}>
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
  const theme = useAppSelector((state) => state.theme);
  const dispatch = useAppDispatch();

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
            <ReloadDBButton proxy={proxy} />
          </div>
          <div>
            <ReinstallDBButton proxy={proxy} onDBDeleted={(message) => setMessage(message)} />
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
