import {
  Box,
  Button,
  Container,
  CssBaseline,
  FormGroup,
  FormLabel,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { ThemeType, useLocaleState, useTheme, useTranslate } from "react-admin";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { makeStyles } from "tss-react/mui";
import { setPlatformHelper, store } from "../app/createStore";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import NolayoutWrapper from "../components/NolayoutWrapper";
import WatchDemo from "../components/WatchDemo";
import { getUserDexie, isInitialisedAsync, setInitialisedAsync } from "../database/authdb";
import { getRefreshedState } from "../features/content/contentSlice";
import { extensionReaderActions } from "../features/content/extensionReaderSlice";
import { setLoading } from "../features/ui/uiSlice";
import { setUser, throttledLogin, updateBaseUrl, updatePassword, updateUsername } from "../features/user/userSlice";
import { refreshDictionaries } from "../lib/dictionary";
import { getDefaultLanguageDictionaries } from "../lib/libMethods";
import {
  BROCROBES_YT_VIDEO,
  DBParameters,
  DEFAULT_EXTENSION_READER_CONFIG_STATE,
  DEFAULT_SERVER_URL,
  DOCS_DOMAIN,
  EXTENSION_READER_ID,
  ExtensionReaderState,
  ProgressCallbackMessage,
  SystemLanguage,
  UserState,
  translationProviderOrder,
} from "../lib/types";
import { DatabaseService as RxDatabaseService } from "../workers/rxdb/DatabaseService";
import { TranscrobesDatabase } from "../workers/rxdb/Schema";
import { rxdbDataManager } from "../workers/rxdb/rxdata";
import { DatabaseService as SqlDatabaseService } from "../workers/sqlite/DatabaseService";
import { sqliteDataManager } from "../workers/sqlite/sqldata";
import { backgroundWorkerManager } from "./backgroundfn";
import ExtensionConfig from "./components/ExtensionConfig";
import Initialisation from "./components/Initialisation";
import Intro from "./components/Intro";
import { getRxdbService, getSqliteService, installDbFromParts, installRxdb } from "./lib/dbs";

let rxDatabaseService: RxDatabaseService;
let sqlDatabaseService: SqlDatabaseService;

type FormProps = {
  username: string;
  password: string;
  baseUrl: string;
};
declare global {
  interface Window {
    tcb: TranscrobesDatabase | null;
  }
}

// THIS IS A FAKE PROXY!!! WE ARE DOING STUFF DIRECTLY HERE!!!
const proxy = { ...backgroundWorkerManager, ...sqliteDataManager, ...rxdbDataManager };
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
  header: {
    paddingTop: "3em",
    width: "100%",
    display: "inline-flex",
    justifyContent: "space-between",
    alignItems: "start",
  },
  headerText: { padding: "1em" },
  configContainer: { maxWidth: "500px" },
}));

function Header(): ReactElement {
  const helpUrl = `http://${DOCS_DOMAIN}/page/software/install/clients/brocrobes/`;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <WatchDemo url={BROCROBES_YT_VIDEO} />
      <HelpButton url={helpUrl} />
    </Box>
  );
}

async function initDbsIfNecessary(userData: UserState) {
  if (!rxDatabaseService) {
    rxDatabaseService = await getRxdbService();
  }
  if (!sqlDatabaseService) {
    sqlDatabaseService = await getSqliteService();
  }
}

export default function Options(): ReactElement {
  const [inited, setInited] = useState<boolean | null>(null);
  const [running, setRunning] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_SERVER_URL);
  const [loaded, setLoaded] = useState(false);
  const [sql, setSql] = useState("");
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [themeName, setTheme] = useTheme(prefersDarkMode ? "dark" : "light");
  const theme = createTheme({
    palette: {
      mode: themeName as ThemeType, // Switching the dark mode on is a single property value change.
    },
  });
  const [locale, setLocale] = useLocaleState() as [SystemLanguage, (locale: SystemLanguage) => void];
  const translate = useTranslate();

  const id = EXTENSION_READER_ID;

  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.userData);
  const { classes } = useStyles();

  useEffect(() => {
    (async () => {
      const userData = await getUserDexie();
      if (userData.user.username && userData.user.accessToken) {
        dispatch(setLoading(true));
        dispatch(setUser(userData));
        setPassword(userData.password);
        setUsername(userData.username);
        setBaseUrl(userData.baseUrl || DEFAULT_SERVER_URL);
        const linit = await isInitialisedAsync(userData.username);
        setInited(linit);
        let conf: ExtensionReaderState = {
          ...DEFAULT_EXTENSION_READER_CONFIG_STATE,
          translationProviderOrder: translationProviderOrder(getDefaultLanguageDictionaries(userData.user.fromLang)),
        };

        if (userData.username && linit) {
          // FIXME: a bit nasty = here these have a side effect of setting up the proxy services
          // I could probably just manually set them. Or is there some obvious clean way I'm missing?
          await initDbsIfNecessary(userData);
          await refreshDictionaries(store, proxy, userData.user.fromLang);
          conf = await getRefreshedState<ExtensionReaderState>(proxy, conf, id);
          dispatch(extensionReaderActions.setState({ id, value: conf }));
        }
        setLocale(conf.locale);
        setTheme(conf.themeName);
        setLoaded(true);
        dispatch(setLoading(false));
      } else {
        setLoaded(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (userData.error) {
      setMessage(translate("screens.extension.login_error", { baseUrl }));
      console.error("Something bad happened, couldnt get an accessToken to start a syncDB()");
    } else {
      setMessage("");
    }
  }, [userData.error]);
  useEffect(() => {
    if (userData.user.username && userData.user.accessToken) {
      dispatch(extensionReaderActions.setLocale({ id, value: locale }));
    }
  }, [locale]);
  useEffect(() => {
    if (loaded && !running && userData.user.accessToken) {
      (async () => {
        const userData = store.getState().userData;
        setRunning(true);
        dispatch(setLoading(true));
        if (!userData.user.accessToken) {
          setMessage(translate("screens.extension.sync_error"));
          console.error("Something bad happened, couldnt get an accessToken to start a syncDB()");
        } else {
          setMessage("");
          const dbConfig: DBParameters = {
            url: new URL(userData.baseUrl),
            username: userData.username,
          };
          console.log("Looks like I'm executing ", dbConfig);
          if (!inited && !running) {
            await Promise.all([
              installRxdb(dbConfig, (progress: ProgressCallbackMessage) =>
                setMessage(translate(progress.message.phrase, progress.message.options)),
              ),
              installDbFromParts(userData, (progress: ProgressCallbackMessage) =>
                setMessage(translate(progress.message.phrase, progress.message.options)),
              ),
            ]);
          }

          try {
            const action = !inited ? "init" : "update";
            setMessage(translate(`screens.extension.${action}_complete`));
            setRunning(false);
            dispatch(setLoading(false));
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
            dispatch(setLoading(false));
            setMessage(translate("screens.extension.error", { docsDomain: DOCS_DOMAIN }));
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
    setMessage(translate("screens.extension.saving_now"));
  }

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
            <NolayoutWrapper proxy={proxy} menuChildren={<Header />}>
              <div className={classes.header}>
                <div>
                  <FormLabel className={classes.headerText} component="legend">
                    {translate("screens.extension.title")}
                  </FormLabel>
                  <FormGroup className={classes.groups}>
                    <TextFieldElement
                      name={"username"}
                      className={classes.controls}
                      required={true}
                      value={username}
                      label={translate("screens.extension.form_email")}
                      type="email"
                      variant="filled"
                    />
                    <TextFieldElement
                      name="password"
                      className={classes.controls}
                      required={true}
                      value={password}
                      label={translate("screens.extension.form_password")}
                      type="password"
                      variant="filled"
                    />
                    <TextFieldElement
                      name={"baseUrl"}
                      className={classes.controls}
                      required={true}
                      value={baseUrl}
                      label={translate("screens.extension.form_server")}
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
                  {/* <Box
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
                  */}
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
                        {translate("screens.extension.save_warning")}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </div>

              {inited && <ExtensionConfig themeName={themeName as ThemeType} />}
              <FormGroup className={classes.buttonGroup}>
                <Box className={classes.controls}>
                  <Button
                    type="submit"
                    disabled={!!running}
                    className={classes.buttons}
                    variant="contained"
                    color="primary"
                  >
                    {translate("ra.action.save")}
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
            </NolayoutWrapper>
          </FormContainer>
        ) : (
          <Loading disableShrink message={translate("screens.extension.save_warning")} />
        )}
        {new URL(location.href).searchParams.get("sql") === "1" && (
          <Box sx={{ height: 500 }}>
            <TextField minRows={5} multiline label="SQL" value={sql} onChange={(val) => setSql(val.target.value)} />
            <Button
              variant="contained"
              onClick={async () => {
                console.log("before execute", sql);
                let defstats = await sqlDatabaseService.proxy.executeSql(sql);
                console.log("after execute", defstats, defstats[0]?.rows?.[0]?.[0]);
              }}
            >
              clickme
            </Button>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
}
