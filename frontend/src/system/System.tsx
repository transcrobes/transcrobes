import { Box, CardHeader, FormControlLabel, Switch, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { ReactElement, useEffect, useState } from "react";
import { Title, TopToolbar, useLocaleState, useTheme, useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import { Loading } from "../components/Loading";
import { clearAuthDatabase } from "../database/authdb";
import { getDatabaseName } from "../database/Database";
import { changeTheme } from "../features/themes/themeReducer";
import { setAndSaveUser } from "../features/user/userSlice";
import { darkTheme, lightTheme } from "../layout/themes";
import { AbstractWorkerProxy } from "../lib/proxies";
import { DOCS_DOMAIN, ThemeName } from "../lib/types";
import { fetcher } from "../lib/fetcher";
import { NAME_PREFIX } from "../lib/interval/interval-decorator";

const CONNECTION_CHECK_FREQUENCY_MS = 10000;

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
  const translate = useTranslate();

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
      {translate("screens.system.refresh_caches")}
    </Button>
  );
}

interface ReloadDBButtonProps {
  proxy: AbstractWorkerProxy;
}
function ReloadDBButton({ proxy }: ReloadDBButtonProps): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
  const username = useAppSelector((state) => state.userData.username);

  async function handleClick() {
    if (username) {
      await proxy.sendMessagePromise<string>({ source: "System", type: "resetDBConnections", value: "" });
      await proxy.asyncInit({ username: username });
    } else {
      console.error("No username found");
    }
  }
  return (
    <Button variant="contained" className={classes.button} color={"primary"} onClick={handleClick}>
      {translate("screens.system.reload_db")}
    </Button>
  );
}

interface ReinstallDBButtonProps {
  beforeReinstall: () => void;
  onDBDeleted: (message: string) => void;
}

function ReinstallDBButton({ beforeReinstall, onDBDeleted }: ReinstallDBButtonProps): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
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
      {translate("screens.system.refresh_db_from_server")}
    </Button>
  );
}

interface Props {
  proxy: AbstractWorkerProxy;
}

function System({ proxy }: Props): ReactElement {
  const translate = useTranslate();
  const [message, setMessage] = useState("");
  const [serverAvailableMessage, setServerAvailableMessage] = useState(translate("screens.system.waiting_for_server"));
  const [loading, setLoading] = useState(false);
  const { classes } = useStyles();

  const helpUrl = `//${DOCS_DOMAIN}/page/software/configure/system/`;

  const [locale, setLocale] = useLocaleState();
  const themeName = useAppSelector((state) => state.theme);
  const user = useAppSelector((state) => state.userData);

  const [, setTheme] = useTheme();
  const dispatch = useAppDispatch();

  function setTimedServerAvailableMessage(message: string): string {
    const mes = message + " " + new Date().toLocaleTimeString();
    setServerAvailableMessage(mes);
    return mes;
  }

  function handleUpdate(mode: ThemeName) {
    localStorage.setItem("mode", mode); // a bit hacky, probably better somewhere else
    setTheme(mode === "dark" ? darkTheme : lightTheme);
    return dispatch(changeTheme(mode));
  }
  function handleShowResearchUpdate(show: boolean) {
    return dispatch(setAndSaveUser({ ...user, showResearchDetails: show }));
  }

  useEffect(() => {
    fetcher
      .fetchPlus<{ exp?: string }>("/api/v1/utils/authed")
      .then((manif) => {
        if (manif.exp) {
          console.log("Server ping success", manif, new Date(manif.exp || 0).toLocaleTimeString());
          setTimedServerAvailableMessage(translate("screens.system.server_available"));
        } else {
          throw new Error(JSON.stringify(manif));
        }
      })
      .catch((error) => {
        console.log("Server ping error", error);
        setTimedServerAvailableMessage(translate("screens.system.server_unavailable"));
      });
    const interval = setInterval(
      () => {
        fetcher
          .fetchPlus<{ exp?: string }>("/api/v1/utils/authed")
          .then((manif) => {
            if (manif.exp) {
              console.log("Server ping success", manif, new Date(manif.exp || 0).toLocaleTimeString());
              setTimedServerAvailableMessage(translate("screens.system.server_available"));
            } else {
              throw new Error(JSON.stringify(manif));
            }
          })
          .catch((error) => {
            console.log("Server ping error", error);
            setTimedServerAvailableMessage(translate("screens.system.server_unavailable"));
          });
      },
      CONNECTION_CHECK_FREQUENCY_MS,
      NAME_PREFIX + "connectionCheck",
    );

    return () => clearInterval(interval);
  }, []);
  return (
    <div>
      <TopToolbar className={classes.toolbar}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <CardHeader title={translate("screens.system.quickfix_actions")} />
      <Card>
        <Title title={translate("pos.system")} />
        <CardContent>
          <Loading position="relative" show={loading} message={translate("screens.system.deleting_database")} />
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

      <CardHeader title={translate("screens.system.user_preferences")} />
      <Card>
        <Title title={translate("pos.configuration")} />
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                defaultChecked={themeName === "dark"}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpdate(event.target.checked ? "dark" : "light")
                }
              />
            }
            label={translate("screens.system.dark_mode")}
          />
        </CardContent>
        {user.user.isAdmin && (
          <CardContent>
            <FormControlLabel
              control={
                <Switch
                  defaultChecked={user.showResearchDetails}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    handleShowResearchUpdate(event.target.checked)
                  }
                />
              }
              label="Show research details"
            />
          </CardContent>
        )}
        <CardContent>
          <div className={classes.label}>{translate("pos.language")}</div>
          <Button
            variant="contained"
            className={classes.button}
            color={locale === "en" ? "info" : "primary"}
            onClick={() => setLocale("en")}
          >
            English
          </Button>
          <Button
            variant="contained"
            className={classes.button}
            color={locale === "zh-Hans" ? "info" : "primary"}
            onClick={() => setLocale("zh-Hans")}
          >
            中文
          </Button>
        </CardContent>
        <CardContent>
          <Box>{serverAvailableMessage}</Box>
        </CardContent>
      </Card>
    </div>
  );
}

export default System;
