import { Box, Container, FormGroup, FormLabel, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { useEffect, useState } from "react";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { makeStyles } from "tss-react/mui";
import { store } from "../app/createStore";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import ReaderConfig from "../contents/common/ReaderConfig";
import { getUserDexie, isInitialisedAsync, setInitialisedAsync } from "../database/authdb";
import { getDb } from "../database/Database";
import { TranscrobesDatabase } from "../database/Schema";
import { getRefreshedState } from "../features/content/contentSlice";
import {
  DEFAULT_WEB_READER_CONFIG_STATE,
  simpleReaderActions,
  SimpleReaderState,
  WEB_READER_ID,
} from "../features/content/simpleReaderSlice";
import { setLoading } from "../features/ui/uiSlice";
import { setUser, throttledLogin, updateBaseUrl, updatePassword, updateUsername } from "../features/user/userSlice";
import { refreshDictionaries } from "../lib/dictionary";
import { BackgroundWorkerProxy, setPlatformHelper } from "../lib/proxies";
import { IS_DEV } from "../lib/types";
import { RxDBDataProviderParams } from "../ra-data-rxdb";
import Initialisation from "./components/Initialisation";
import Intro from "./components/Intro";

const DEFAULT_SERVER_URL = IS_DEV ? "http://localhost" : "https://am.transcrob.es";

type FormProps = {
  username: string;
  password: string;
  baseUrl: string;
};
declare global {
  interface Window {
    tcb: TranscrobesDatabase;
  }
}
const proxy = new BackgroundWorkerProxy();
setPlatformHelper(proxy);

const useStyles = makeStyles()((theme) => ({
  groups: {
    margin: theme.spacing(1),
    maxWidth: "300px",
  },
  controls: {
    margin: theme.spacing(1),
  },
  buttons: {
    margin: theme.spacing(1),
    width: "200px",
  },
  message: {},
  glossFontColour: { display: "flex", justifyContent: "flex-start", padding: "0.4em" },
  header: { display: "inline-flex", justifyContent: "space-between", alignItems: "start" },
  headerText: { padding: "1em" },
  configContainer: { maxWidth: "500px" },
}));

export default function Options(): JSX.Element {
  const [inited, setInited] = useState<boolean | null>(null);
  const [running, setRunning] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_SERVER_URL);
  const [loaded, setLoaded] = useState(false);

  const id = WEB_READER_ID;

  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.userData);
  const readerConfig = useAppSelector((state) => state.simpleReader[id] || DEFAULT_WEB_READER_CONFIG_STATE);
  const { classes } = useStyles();
  dispatch(setLoading(true));
  useEffect(() => {
    (async () => {
      dispatch(setUser(await getUserDexie()));
      const userData = store.getState().userData;
      setPassword(userData.password);
      setUsername(userData.username);
      setBaseUrl(userData.baseUrl || DEFAULT_SERVER_URL);

      const linit = await isInitialisedAsync(userData.username);
      setInited(linit);
      let conf: SimpleReaderState = { ...DEFAULT_WEB_READER_CONFIG_STATE, id };
      if (userData.username && linit) {
        await proxy.asyncInit({ username: userData.username });
        await refreshDictionaries(store, proxy);
        conf = await getRefreshedState<SimpleReaderState>(proxy, DEFAULT_WEB_READER_CONFIG_STATE, id);
      }
      dispatch(simpleReaderActions.setState({ id, value: conf }));
      setLoaded(true);
      dispatch(setLoading(false));
    })();
  }, []);
  useEffect(() => {
    if (userData.error) {
      setMessage(
        `There was an error logging in to ${baseUrl}. \n\n
          Please check the login details, or try again in a short while.`,
      );
      console.error("Something bad happened, couldnt get an accessToken to start a syncDB()");
    } else {
      setMessage("");
    }
  }, [userData.error]);

  useEffect(() => {
    if (loaded) {
      (async () => {
        const userData = store.getState().userData;
        setRunning(true);
        if (!userData.user.accessToken) {
          setMessage("There was an error starting the initial synchronisation. Please try again in a short while.");
          console.error("Something bad happened, couldnt get an accessToken to start a syncDB()");
        } else {
          setMessage("");
          const dbConfig: RxDBDataProviderParams = { url: new URL(userData.baseUrl), username: userData.username };

          const progressCallback = (message: string) => {
            setMessage(message);
          };
          const db = await getDb(dbConfig, progressCallback, undefined);
          try {
            window.tcb = db;
            const action = !inited ? "Initialisation" : "Settings Update";
            setMessage(`${action} Complete!`);
            setRunning(false);
            await setInitialisedAsync(userData.username);
            console.debug("Synchronisation finished!");
            setInited(true);
            // Prior to this point the db might not have been inited, meaning that the state persistence
            // would not have happened. This happens on the first run. Setting state here ensures that the
            // conf is properly persisted.
            dispatch(
              simpleReaderActions.setState({
                id,
                value: store.getState().simpleReader[WEB_READER_ID],
              }),
            );
            location.reload();
          } catch (err: any) {
            setRunning(false);
            setMessage(`There was an error setting up Transcrobes.
                  Please try again in a little while, or contact Transcrobes support (<a href="https://transcrob.es/page/contact/">here</a>)`);
            console.log("getDb() threw an error in options.ts");
            console.dir(err);
            console.error(err);
          }
        }
      })();
    }
  }, [userData.user.accessToken]);

  async function saveFields(values: FormProps) {
    dispatch(updateUsername(values.username));
    dispatch(updatePassword(values.password));
    dispatch(updateBaseUrl(values.baseUrl));
    dispatch(throttledLogin());
    setMessage("Saving the options, please wait and keep this window open...");
  }

  const helpUrl = "https://transcrob.es/page/software/install/clients/brocrobes/";

  return (
    <Container maxWidth="md">
      {loaded ? (
        <FormContainer
          defaultValues={{
            username,
            password,
            baseUrl,
          }}
          onSuccess={saveFields}
        >
          <div className={classes.header}>
            <div>
              <FormLabel className={classes.headerText} component="legend">
                Transcrobes Server Connection Settings
              </FormLabel>
              <FormGroup className={classes.groups}>
                <TextFieldElement
                  name={"username"}
                  className={classes.controls}
                  required={true}
                  value={username}
                  label="Username"
                  type="email"
                  variant="filled"
                />
                <TextFieldElement
                  name="password"
                  className={classes.controls}
                  required={true}
                  value={password}
                  label="Password"
                  type="password"
                  variant="filled"
                />
                <TextFieldElement
                  name={"baseUrl"}
                  className={classes.controls}
                  required={true}
                  value={baseUrl}
                  label="Server URL"
                  type="url"
                  variant="filled"
                />
              </FormGroup>
            </div>
            <HelpButton url={helpUrl} />
          </div>

          {inited && (
            <ReaderConfig
              classes={classes}
              actions={simpleReaderActions}
              readerConfig={readerConfig}
              allowMainTextOverride={false}
            />
          )}
          <FormGroup className={classes.groups}>
            <Box className={classes.controls}>
              <Button
                type="submit"
                disabled={!!running}
                className={classes.buttons}
                variant="contained"
                color="primary"
              >
                Save
              </Button>
            </Box>
          </FormGroup>
          <Typography
            sx={(theme) => ({
              margin: theme.spacing(1),
              fontSize: "2em",
              color: userData.error ? "error.main" : "text.primary",
            })}
          >
            {message}
          </Typography>
          <Intro inited={!!inited} />
          {running && (
            <>
              <Loading position="fixed" disableShrink />
              <Initialisation />
            </>
          )}
        </FormContainer>
      ) : (
        <Loading disableShrink message="Loading configuration from the local database..." />
      )}
    </Container>
  );
}
