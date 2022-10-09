import {
  Box,
  Container,
  createTheme,
  CssBaseline,
  FormGroup,
  FormLabel,
  ThemeProvider,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import { ReactElement, useEffect, useState } from "react";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { makeStyles } from "tss-react/mui";
import { store } from "../app/createStore";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import WatchDemo from "../components/WatchDemo";
import { getUserDexie, isInitialisedAsync, setInitialisedAsync } from "../database/authdb";
import { getDb } from "../database/Database";
import { TranscrobesDatabase } from "../database/Schema";
import { getRefreshedState } from "../features/content/contentSlice";
import { extensionReaderActions } from "../features/content/extensionReaderSlice";
import { changeTheme } from "../features/themes/themeReducer";
import { setLoading } from "../features/ui/uiSlice";
import { setUser, throttledLogin, updateBaseUrl, updatePassword, updateUsername } from "../features/user/userSlice";
import { darkTheme, lightTheme } from "../layout/themes";
import { refreshDictionaries } from "../lib/dictionary";
import { BackgroundWorkerProxy, setPlatformHelper } from "../lib/proxies";
import {
  BROCROBES_YT_VIDEO,
  DEFAULT_EXTENSION_READER_CONFIG_STATE,
  DOCS_DOMAIN,
  ExtensionReaderState,
  EXTENSION_READER_ID,
  IS_DEV,
  SITE_DOMAIN,
} from "../lib/types";
import { RxDBDataProviderParams } from "../ra-data-rxdb";
import Initialisation from "./components/Initialisation";
import Intro from "./components/Intro";
import ExtensionConfig from "./ExtensionReaderConfig";

const DEFAULT_SERVER_URL = `http${IS_DEV ? "" : "s"}://${SITE_DOMAIN}`;

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
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      minWidth: "200px",
    },
    [theme.breakpoints.up("sm")]: {
      minWidth: "300px",
    },
  },
  buttonGroup: {
    margin: theme.spacing(1),
  },
  controls: {
    margin: theme.spacing(1),
  },
  buttons: {
    width: "100%",
  },
  message: {},
  glossFontColour: { display: "flex", justifyContent: "flex-start", padding: "0.4em" },
  header: { width: "100%", display: "inline-flex", justifyContent: "space-between", alignItems: "start" },
  headerText: { padding: "1em" },
  configContainer: { maxWidth: "500px" },
}));

export default function Options(): ReactElement {
  const [inited, setInited] = useState<boolean | null>(null);
  const [running, setRunning] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_SERVER_URL);
  const [loaded, setLoaded] = useState(false);
  const theme = useAppSelector((state) => createTheme(state.theme === "dark" ? darkTheme : lightTheme));

  const id = EXTENSION_READER_ID;

  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.userData);
  const { classes } = useStyles();
  dispatch(setLoading(true));
  useEffect(() => {
    console.log("i am in options");
    (async () => {
      console.log("i am in options async");
      dispatch(setUser(await getUserDexie()));
      const userData = store.getState().userData;
      setPassword(userData.password);
      setUsername(userData.username);
      setBaseUrl(userData.baseUrl || DEFAULT_SERVER_URL);

      console.log("i am in options async biz");
      const linit = await isInitialisedAsync(userData.username);
      console.log("i am in options async biz2");
      setInited(linit);
      let conf: ExtensionReaderState = { ...DEFAULT_EXTENSION_READER_CONFIG_STATE, id };
      if (userData.username && linit) {
        console.log("i am in options async biz3");
        await proxy.asyncInit({ username: userData.username });
        console.log("i am in options async biz4");
        await refreshDictionaries(store, proxy);
        conf = await getRefreshedState<ExtensionReaderState>(proxy, DEFAULT_EXTENSION_READER_CONFIG_STATE, id);
      }
      console.log("i am in options async biz again");
      dispatch(changeTheme(conf.themeName));
      dispatch(extensionReaderActions.setState({ id, value: conf }));
      console.log("i am in options async biz again again");
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
    console.log("i am in options other");
    if (loaded) {
      (async () => {
        console.log("i am in options other loaded");
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
            // Prior to this point the db might not have been inited, meaning that the state persistence
            // would not have happened. This happens on the first run. Setting state here ensures that the
            // conf is properly persisted.
            dispatch(
              extensionReaderActions.setState({
                id,
                value: store.getState().extensionReader[id],
              }),
            );
            if (!inited) {
              location.reload();
            }
            setInited(true);
          } catch (err: any) {
            setRunning(false);
            setMessage(`There was an error setting up Transcrobes.
                  Please try again in a little while, or contact Transcrobes support (<a href="http://${DOCS_DOMAIN}/page/contact/">here</a>)`);
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
    dispatch(throttledLogin() as any);
    setMessage("Saving the options, please wait and keep this window open...");
  }

  const helpUrl = `http://${DOCS_DOMAIN}/page/software/install/clients/brocrobes/`;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
                    label="Email"
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
              <Box
                sx={{
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    display: "inline-flex",
                    justifyContent: "space-between",
                    padding: "1em",
                  }}
                >
                  <WatchDemo url={BROCROBES_YT_VIDEO} />
                  <HelpButton url={helpUrl} />
                </Box>
                {inited && (
                  <Box>
                    <Typography
                      sx={(theme) => ({
                        bgcolor: "warning.light",
                        [theme.breakpoints.down("md")]: {
                          fontSize: "1em",
                          padding: "0.2em",
                          margin: "0.2em",
                        },
                        [theme.breakpoints.up("md")]: {
                          fontSize: "2em",
                          padding: "0.5em",
                          margin: "0.5em",
                        },
                      })}
                    >
                      Don't forget to hit save (at the bottom) after making a change!
                    </Typography>
                  </Box>
                )}
              </Box>
            </div>

            {inited && <ExtensionConfig />}
            <FormGroup className={classes.buttonGroup}>
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
    </ThemeProvider>
  );
}
