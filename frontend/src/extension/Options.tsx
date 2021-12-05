import { useEffect, useState } from "react";
import Button from "@material-ui/core/Button";
import * as utils from "../lib/lib";
import * as ap from "../lib/JWTAuthProvider";
import { getDb } from "../database/Database";
import { RxDBDataProviderParams } from "../ra-data-rxdb";
import Loader from "../img/loader.gif";
import { USER_STATS_MODE } from "../lib/lib";
import { TranscrobesDatabase } from "../database/Schema";
import { onError } from "../lib/funclib";
import {
  Box,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@material-ui/core";
import GlossingSelector from "../components/GlossingSelector";

declare global {
  interface Window {
    tcb: TranscrobesDatabase;
  }
}

const useStyles = makeStyles((theme) => ({
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
  message: {
    margin: theme.spacing(1),
    fontSize: "2em",
  },
}));

function Initialisation() {
  return (
    <>
      <Typography variant="h4">Initialisation started</Typography>
      <Typography>
        Please be patient while the initialisation finishes. The initialisation will give some
        updates but you should not be worried unless you see no update for over 5 minutes. No harm
        should come if you stop the initialisation by navigating away or closing the browser. The
        initialisation will pick up where it left off when you return.
      </Typography>
    </>
  );
}
function Intro({ inited }: { inited: boolean }) {
  return !inited ? (
    <>
      <Typography variant="h4">Welcome! It's Transcrobes initialisation time!</Typography>
      <Typography>
        Transcrobes is entirely browser-based but needs to download a lot of reference data in order
        to save on bandwidth and dramatically improve performance, and that is going to take a while
        (15-25 minutes, depending on how fast your phone/tablet/computer is).
      </Typography>
      <Typography>
        The system needs to do quite a lot of work, so don't be alarmed if your devices heat up a
        bit and the fan switches on. It's normal, and will only happen once, at initialisation time.
        It's better to not interrupt the initialisation while it's happening, so make sure your
        device has plenty of battery, or is plugged in. It will also download 25-50MB of data so if
        you are not on wifi, make sure that is not a problem for your data plan.
      </Typography>
    </>
  ) : (
    <>
      <Typography variant="h4">Reinitialise Transcrobes or update settings</Typography>
      <Typography>
        You may need to reinitialise the system if you encounter issues, such as the system not
        transcrobing webpages. If it works on <b>some</b> pages then reinitilising won't have any
        effect, so keep this in mind. Reinitialising will take 15-25 minutes.
      </Typography>
      <Typography>
        Saving updated settings should only take a few seconds, unless you are changing your
        username. You may need to reinitialise if you change your username.
      </Typography>
    </>
  );
}
export default function Options(): JSX.Element {
  const [inited, setInited] = useState<boolean | null>(null);
  const [running, setRunning] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [glossing, setGlossing] = useState(USER_STATS_MODE.L1);
  const [segmentation, setSegmentation] = useState(true);
  const [mouseover, setMouseover] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await ap.getUsername();
      if (user) {
        setUsername(user);
        const ined = await ap.isInitialisedAsync(user);
        setInited(ined);
      }
      const pwd = await ap.getPassword();
      if (pwd) setPassword(pwd);
      const bUrl = await ap.getValue("baseUrl");
      if (bUrl) setBaseUrl(bUrl);
      const gl = await ap.getValue("glossing");
      if (gl) setGlossing(parseInt(gl));
      else setGlossing(USER_STATS_MODE.L1);
      const seg = await ap.getValue("segmentation");
      if (seg) setSegmentation(parseInt(seg) > 0);
      const mo = await ap.getValue("mouseover");
      if (mo) setMouseover(parseInt(mo) > 0);
    })();
  }, []);

  async function saveFields() {
    utils.setUsername(username);
    utils.setPassword(password);
    utils.setBaseUrl(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
    utils.setGlossing(glossing);
    utils.setMouseover(mouseover);
    utils.setSegmentation(segmentation);

    await Promise.all([
      ap.setUsername(utils.username),
      ap.setPassword(utils.password),
      ap.setValue("baseUrl", utils.baseUrl),
      ap.setValue("glossing", utils.glossing.toString()),
      ap.setValue("mouseover", utils.mouseover ? "1" : "0"),
      ap.setValue("segmentation", utils.segmentation ? "1" : "0"),
    ]);
    setMessage("Options saved.");
    await ap.refreshAccessToken(new URL(utils.baseUrl));
    const items = await Promise.all([ap.getAccess(), ap.getRefresh()]);
    if (!(items[0] && items[1])) {
      throw new Error("Unable to get tokens");
    }
    utils.setAccessToken(items[0]);
    utils.setRefreshToken(items[1]);
  }

  async function handleSubmit(forceReinit: boolean) {
    await saveFields();

    setRunning(true);

    if (!utils.accessToken) {
      setMessage(
        "There was an error starting the initial synchronisation. Please try again in a short while.",
      );
      onError("Something bad happened, couldnt get an accessToken to start a syncDB()");
    } else {
      setMessage("");
      const dbConfig: RxDBDataProviderParams = { url: new URL(utils.baseUrl) };

      const progressCallback = (message: string) => {
        console.debug("progressCallback in options.ts", message);
        setMessage(message);
      };
      const db = await getDb(dbConfig, progressCallback, !!inited && forceReinit);
      try {
        window.tcb = db;
        const action = !inited
          ? "Initialisation"
          : forceReinit
          ? "Reinitialisation"
          : "Settings Update";
        setMessage(`${action} Complete!`);
        setRunning(false);
        await ap.setInitialisedAsync(utils.username);
        console.debug("Synchronisation finished!");
      } catch (err: any) {
        setRunning(false);
        setMessage(`There was an error setting up Transcrobes.
              Please try again in a little while, or contact Transcrobes support (<a href="https://transcrob.es/page/contact/">here</a>)`);
        console.log("getDb() threw an error in options.ts");
        console.dir(err);
        console.error(err);
      }
    }
  }
  const classes = useStyles();
  return (
    <Container maxWidth="md">
      <FormLabel component="legend">Transcrobes Server Connection Settings</FormLabel>
      <FormGroup className={classes.groups}>
        <TextField
          className={classes.controls}
          required={true}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          label="Username"
          type="email"
          variant="filled"
        />
        <TextField
          className={classes.controls}
          required={true}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          label="Password"
          type="password"
          variant="filled"
        />
        <TextField
          className={classes.controls}
          required={true}
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value);
          }}
          label="Server URL"
          type="url"
          variant="filled"
        />
      </FormGroup>
      <FormLabel component="legend">Reader Settings</FormLabel>
      <FormGroup className={classes.groups}>
        <FormControl className={classes.controls}>
          <InputLabel shrink>Glossing</InputLabel>
          <GlossingSelector value={glossing} onGlossingChange={setGlossing} />
        </FormControl>
        <FormControlLabel
          className={classes.controls}
          control={
            <Switch checked={segmentation} onChange={(_e, checked) => setSegmentation(checked)} />
          }
          label="Segment words"
        />
        <FormControlLabel
          className={classes.controls}
          control={<Switch checked={mouseover} onChange={(_e, checked) => setMouseover(checked)} />}
          label="Mouseover mini-definition"
        />
      </FormGroup>
      <FormGroup className={classes.groups}>
        <Box className={classes.controls}>
          <Button
            disabled={!!running}
            className={classes.buttons}
            onClick={() => handleSubmit(false)}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </Box>
        {inited && (
          <Box className={classes.controls}>
            <Button
              disabled={!!running}
              className={classes.buttons}
              onClick={() => handleSubmit(true)}
              variant="contained"
              color="primary"
            >
              Reinitialise
            </Button>
          </Box>
        )}
      </FormGroup>
      <Typography className={classes.message}>{message}</Typography>
      <Intro inited={!!inited} />
      {running && (
        <>
          <img alt="Running" src={Loader} /> <Initialisation />
        </>
      )}
    </Container>
  );
}
