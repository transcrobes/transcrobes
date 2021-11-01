import { ReactElement, useState } from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import { CardHeader, Typography } from "@material-ui/core";
import { useTranslate, Title } from "react-admin";

import { getUsername, setInitialised } from "../lib/JWTAuthProvider";
import { getDatabaseName, deleteDatabase } from "../database/Database";
import { AbstractWorkerProxy } from "../lib/proxies";

const useStyles = makeStyles({
  label: { width: "10em", display: "inline-block" },
  button: { margin: "1em" },
});

interface RefreshCacheButtonProps {
  onCacheEmptied: (message: string) => void;
}

function RefreshCacheButton({ onCacheEmptied }: RefreshCacheButtonProps): ReactElement {
  const classes = useStyles();

  function handleClick() {
    const version = "v1"; // FIXME: horrible, nasty hardcoding!!!
    caches.delete(version).then(() => {
      const message = "Caches cleared";
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
      deleteDatabase(dbName).then(() => {
        const message = `Removed ${dbName}`;
        onDBDeleted(message);
        console.log(message);
        setInitialised(username, false);
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

// function TestWBButton(): ReactElement {
//   async function handleClick() {
//     const wb = new Workbox("/service-worker.js");
//
//     wb.register();
//     const alist = await wb.messageSW({
//       type: "DB",
//       method: "getList",
//       collection: "imports",
//       params: {},
//     });
//     console.log("Example nice async messaging", alist);
//   }
//   return <button onClick={handleClick}>Test WB</button>;
// }

interface Props {
  proxy: AbstractWorkerProxy;
}

function System({ proxy }: Props): ReactElement {
  const translate = useTranslate();
  const [message, setMessage] = useState("");
  return (
    <div>
      {/* <Card>
        <Title title={translate("pos.system")} />
        <CardContent>
          <Button
            variant="contained"
            className={classes.button}
            // color={theme === 'dark' ? 'primary' : 'default'}
            color={"primary"}
            onClick={() => initialise()}
          >
            {translate("resources.system.initialise")}
          </Button>
        </CardContent>
      </Card> */}
      <Card>
        <Title title={translate("pos.system")} />
        <CardHeader title="Quick-fix actions" />
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
          {/* <TestWBButton /> */}
          <Typography>{message}</Typography>
        </CardContent>
      </Card>
    </div>
  );
}

export default System;
