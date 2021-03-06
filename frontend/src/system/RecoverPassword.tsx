import { ReactElement, useState } from "react";
import { Notification, useTranslate, useNotify } from "react-admin";
import { Field, withTypes } from "react-final-form";
import ReplayIcon from "@mui/icons-material/Replay";
import { makeStyles } from "tss-react/mui";
import Card from "@mui/material/Card";
import Avatar from "@mui/material/Avatar";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Link } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { TextField } from "@mui/material";
import { DOCS_DOMAIN } from "../lib/types";

const useStyles = makeStyles()((theme) => ({
  main: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "flex-start",
    background: "url(https://source.unsplash.com/random/1600x900/?china)",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  },
  card: {
    minWidth: 300,
    maxWidth: 600,
    marginTop: "6em",
  },
  avatar: {
    margin: "1em",
    display: "flex",
    justifyContent: "center",
  },
  icon: {
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    padding: "0 1em 1em 1em",
  },
  input: {
    marginTop: "1em",
  },
  actions: {
    padding: "0 1em 1em 1em",
  },
  userManagement: {
    padding: "0 1em 1em 1em",
  },
}));

interface FormValues {
  email?: string;
}

// FIXME: copy/pasted from Login.tsx
function renderInput({
  meta: { touched, error } = { touched: false, error: undefined },
  input: { ...inputProps },
  ...props
}): ReactElement {
  return <TextField error={!!(touched && error)} helperText={touched && error} {...inputProps} {...props} fullWidth />;
}

const { Form } = withTypes<FormValues>();

export default function RecoverPassword(): ReactElement {
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();
  const { classes } = useStyles();
  const notify = useNotify();

  function handleSubmit(auth: FormValues) {
    setLoading(true);
    // FIXME: hardcoded url
    fetch(`${location.origin}/api/v1/password-recovery/${auth.email}`, { method: "POST" })
      .then(() => {
        notify("user.reset_password.email_success", { type: "success" });
        setLoading(false);
      })
      .catch((error: Error) => {
        setLoading(false);
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
            ? "user.reset_password.error"
            : error.message,
          { type: "warning" },
          // {
          //   _: typeof error === "string" ? error : error && error.message ? error.message : undefined,
          // },
        );
      });
  }

  function validate(values: FormValues) {
    const errors: FormValues = {};
    if (!values.email) {
      errors.email = translate("ra.validation.required");
    }
    return errors;
  }

  const helpUrl = `//${DOCS_DOMAIN}`;
  return (
    <Form
      onSubmit={handleSubmit}
      validate={validate}
      render={({ handleSubmit }) => (
        <form onSubmit={handleSubmit} noValidate>
          <div className={classes.main}>
            <Card className={classes.card}>
              <div className={classes.avatar}>
                <Avatar className={classes.icon}>
                  <ReplayIcon />
                </Avatar>
              </div>
              <div className={classes.form}>
                <div className={classes.input}>
                  <Field
                    autoFocus
                    name="email"
                    // @ts-ignore
                    component={renderInput}
                    label={translate("user.email")}
                    disabled={loading}
                  />
                </div>
              </div>
              <CardActions className={classes.actions}>
                <Button variant="contained" type="submit" color="primary" disabled={loading} fullWidth>
                  {loading && <CircularProgress size={25} thickness={2} />}
                  {translate("user.reset_password.recover")}
                </Button>
              </CardActions>
              <div>
                <div className={classes.userManagement}>
                  <Typography>
                    <Link to="/login">{translate("ra.auth.sign_in")}</Link>
                  </Typography>
                </div>
                <div className={classes.userManagement}>
                  <Typography>
                    <Link to="/signup">{translate("user.signup.label")}</Link>
                  </Typography>
                </div>
                <div className={classes.userManagement}>
                  <Typography>
                    <a target={"_blank"} href={helpUrl}>
                      {translate("user.help.site")}
                    </a>
                  </Typography>
                </div>
              </div>
            </Card>
            <Notification />
          </div>
        </form>
      )}
    />
  );
}
