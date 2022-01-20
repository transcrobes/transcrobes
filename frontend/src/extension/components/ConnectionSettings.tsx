import { FormGroup, FormLabel, TextField } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import { ReactElement } from "react";

type Props = {
  username: string;
  password: string;
  baseUrl: string;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  classes: ClassNameMap<"groups" | "controls" | "headerText">;
};

export default function ConnectionSettings({
  username,
  password,
  baseUrl,
  setUsername,
  setPassword,
  setBaseUrl,
  classes,
}: Props): ReactElement {
  return (
    <div>
      <FormLabel className={classes.headerText} component="legend">
        Transcrobes Server Connection Settings
      </FormLabel>
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
    </div>
  );
}
