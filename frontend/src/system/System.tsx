import { CardHeader, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { ReactElement, useState } from "react";
import { Title, TopToolbar, useTheme, useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import { Loading } from "../components/Loading";
import { clearAuthDatabase } from "../database/authdb";
import { getDatabaseName } from "../database/Database";
import { changeTheme } from "../features/themes/themeReducer";
import { darkTheme, lightTheme } from "../layout/themes";
import { AbstractWorkerProxy } from "../lib/proxies";
import { ThemeName } from "../lib/types";

const useStyles = makeStyles()({
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
  const { classes } = useStyles();

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

interface ReloadDBButtonProps {
  proxy: AbstractWorkerProxy;
}
function ReloadDBButton({ proxy }: ReloadDBButtonProps): ReactElement {
  const { classes } = useStyles();

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

interface ReinstallDBButtonProps {
  beforeReinstall: () => void;
  onDBDeleted: (message: string) => void;
}

function ReinstallDBButton({ beforeReinstall, onDBDeleted }: ReinstallDBButtonProps): ReactElement {
  const { classes } = useStyles();
  const username = useAppSelector((state) => state.userData.username);

  async function handleClick() {
    if (username) {
      beforeReinstall();
      const dbName = getDatabaseName({ url: new URL(window.location.href), username });
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.unregister();
      await clearAuthDatabase();

      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name && db.name.includes(dbName)) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      const message = `Removed the database ${dbName}`;
      onDBDeleted(message);
      console.log(message);
      window.location.href = "/";
    }
  }
  return (
    <Button variant="contained" className={classes.button} color={"primary"} onClick={handleClick}>
      Refresh DB from server (up to 10 mins)
    </Button>
  );
}

interface Props {
  proxy: AbstractWorkerProxy;
}

function System({ proxy }: Props): ReactElement {
  const translate = useTranslate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { classes } = useStyles();
  const helpUrl = "https://transcrob.es/page/software/configure/system/";

  // const locale = useLocale();
  // const setLocale = useSetLocale();

  const myTheme = useAppSelector((state) => state.theme);
  const [theme, setTheme] = useTheme();
  const dispatch = useAppDispatch();

  function handleUpdate(mode: ThemeName) {
    localStorage.setItem("mode", mode); // a bit hacky, probably better somewhere else
    setTheme(mode === "dark" ? darkTheme : lightTheme);
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
          <Loading position="relative" show={loading} message="Deleting the databases" />
          <div>
            <RefreshCacheButton onCacheEmptied={(message) => setMessage(message)} />
          </div>
          <div>
            <ReloadDBButton proxy={proxy} />
          </div>
          <div>
            <ReinstallDBButton
              beforeReinstall={() => setLoading(true)}
              onDBDeleted={(message) => {
                setMessage(message);
              }}
            />
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
            color={myTheme === "light" ? "primary" : undefined}
            onClick={() => handleUpdate("light")}
          >
            {translate("pos.theme.light")}
          </Button>
          <Button
            variant="contained"
            className={classes.button}
            color={myTheme === "dark" ? "primary" : undefined}
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
