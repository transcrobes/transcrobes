import { Box, Button, Card, CardContent, CardHeader, FormControlLabel, Switch, Typography } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { Title, TopToolbar, useTranslate } from "react-admin";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import { Loading } from "../components/Loading";
import type { DataManager } from "../data/types";
import { clearAuthDatabase } from "../database/authdb";
import { setAndSaveUser } from "../features/user/userSlice";
import { fetcher } from "../lib/fetcher";
import { DOCS_DOMAIN, GIT_VERSION } from "../lib/types";
import { getDatabaseName } from "../workers/rxdb/Database";
import ToggleIncludeIgnored from "./ToggleIncludeIgnored";
import ToggleIncludeNonDict from "./ToggleIncludeNonDict";
import { NAME_PREFIX } from "../lib/interval/interval-decorator";

const CONNECTION_CHECK_FREQUENCY_MS = 10000;

interface CleanResentSentencesButtonProps {
  onPurged: (message: string) => void;
  proxy: DataManager;
}
function CleanResentSentencesButton({ proxy, onPurged }: CleanResentSentencesButtonProps): ReactElement {
  const translate = useTranslate();

  async function handleClick() {
    const purged = await proxy.purgeInvalidRecentSentences();
    onPurged(JSON.stringify(purged));
  }
  return (
    <Button variant="contained" sx={{ margin: "1em" }} color={"primary"} onClick={handleClick}>
      {translate("screens.system.purge_invalid_recents")}
    </Button>
  );
}

interface RefreshCacheButtonProps {
  onCacheEmptied: (message: string) => void;
}

function RefreshCacheButton({ onCacheEmptied }: RefreshCacheButtonProps): ReactElement {
  const translate = useTranslate();

  function handleClick() {
    // WEBPUB_CACHE_NAME
    caches.keys().then(async (cacheNames) => {
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          await caches.delete(cacheName);
        }),
      );
      const message = translate("screens.system.caches_cleared", { cacheNames: cacheNames.join(", ") });
      onCacheEmptied(message);
    });
  }
  return (
    <Button variant="contained" sx={{ margin: "1em" }} color={"primary"} onClick={handleClick}>
      {translate("screens.system.refresh_caches")}
    </Button>
  );
}

// interface ReloadDBButtonProps {
//   proxy: DataManager;
// }
//
// function ReloadDBButton({ proxy }: ReloadDBButtonProps): ReactElement {
//   const translate = useTranslate();
//   const username = useAppSelector((state) => state.userData.username);
//
//   async function handleClick() {
//     if (username) {
//       await proxy.sendMessagePromise({ source: "System", type: "resetDBConnections", value: "" });
//     } else {
//       console.error("No username found");
//     }
//   }
//   return (
//     <Button variant="contained" sx={{ margin: "1em" }} color={"primary"} onClick={handleClick}>
//       {translate("screens.system.reload_db")}
//     </Button>
//   );
// }

interface ReinstallDBButtonProps {
  beforeReinstall: () => void;
  onDBDeleted: (message: string) => void;
}

function ReinstallDBButton({ beforeReinstall, onDBDeleted }: ReinstallDBButtonProps): ReactElement {
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
    <Button variant="contained" sx={{ margin: "1em" }} color={"primary"} onClick={handleClick}>
      {translate("screens.system.refresh_db_from_server")}
    </Button>
  );
}

interface Props {
  proxy: DataManager;
}

function System({ proxy }: Props): ReactElement {
  const translate = useTranslate();
  const [message, setMessage] = useState("");
  const [serverAvailableMessage, setServerAvailableMessage] = useState(translate("screens.system.waiting_for_server"));
  const [loading, setLoading] = useState(false);
  const helpUrl = `//${DOCS_DOMAIN}/page/software/configure/system/`;
  const user = useAppSelector((state) => state.userData);
  const dispatch = useAppDispatch();

  function setTimedServerAvailableMessage(message: string): string {
    const mes = message + " " + new Date().toLocaleTimeString();
    setServerAvailableMessage(mes);
    return mes;
  }

  function handleShowResearchUpdate(show: boolean) {
    return dispatch(setAndSaveUser({ ...user, showResearchDetails: show }));
  }
  function serverPing() {
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
  }
  useEffect(() => {
    serverPing();
    const interval = setInterval(serverPing, CONNECTION_CHECK_FREQUENCY_MS, NAME_PREFIX + "connectionCheck");
    return () => clearInterval(interval);
  }, []);
  return (
    <div>
      <TopToolbar sx={{ justifyContent: "flex-end", alignItems: "center" }}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <CardHeader title={translate("screens.system.quickfix_actions")} />
      <Card>
        <Title title={translate("screens.main.system")} />
        <CardContent>
          <Loading position="relative" show={loading} message={translate("screens.system.deleting_database")} />
          <div>
            <RefreshCacheButton onCacheEmptied={(message) => setMessage(message)} />
          </div>
          {/* <div>
            <ReloadDBButton proxy={proxy} />
          </div> */}
          <div>
            <CleanResentSentencesButton proxy={proxy} onPurged={(message) => setMessage(message)} />
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

      <>
        <CardHeader title={translate("screens.system.user_preferences")} />
        <Card>
          <Title title={translate("screens.main.configuration")} />
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
        </Card>
        <CardContent>
          <ToggleIncludeIgnored />
        </CardContent>
        <CardContent>
          <ToggleIncludeNonDict />
        </CardContent>
      </>

      <CardHeader title={translate("screens.system.system_info")} />
      <Card>
        <CardContent>
          <Box>V: {GIT_VERSION}</Box>
          <Box>{serverAvailableMessage}</Box>
        </CardContent>
      </Card>
    </div>
  );
}

export default System;
