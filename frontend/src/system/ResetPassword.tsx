import { ReactElement, useEffect, useState } from "react";
import { Notification, useTranslate, useNotify } from "react-admin";
import { useHistory } from "react-router";
import { Field, withTypes } from "react-final-form";
import ReplayIcon from "@material-ui/icons/Replay";
import { makeStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import Avatar from "@material-ui/core/Avatar";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { Link } from "react-router-dom";
import CircularProgress from "@material-ui/core/CircularProgress";
import { TextField } from "@material-ui/core";
import { useCookies } from "react-cookie";
import PasswordStrengthBar from "react-password-strength-bar";
import { OnChange } from "react-final-form-listeners";
import { setAccess, setPassword, setRefresh } from "../lib/JWTAuthProvider";

const useStyles = makeStyles((theme) => ({
  main: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "flex-start",
    background: "url(https://source.unsplash.com/random/1600x900)",
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
  hint: {
    marginTop: "1em",
    display: "flex",
    justifyContent: "center",
    color: theme.palette.grey[500],
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
  password?: string;
  repeatPassword?: string;
}

// FIXME: copy/pasted from Login.tsx, with type addition
function renderInput({
  meta: { touched, error } = { touched: false, error: undefined },
  input: { ...inputProps },
  ...props
}): ReactElement {
  return (
    <TextField
      type="password"
      autoComplete="new-password"
      error={!!(touched && error)}
      helperText={touched && error}
      {...inputProps}
      {...props}
      fullWidth
    />
  );
}

const { Form } = withTypes<FormValues>();

function ResetPassword(): ReactElement {
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();
  const classes = useStyles();
  const notify = useNotify();
  const history = useHistory();
  const [password, setLocalPassword] = useState("");
  const [passwordScore, setPasswordScore] = useState(0);

  const [_cookies, _setCookie, removeCookie] = useCookies(["refresh", "session"]);

  const token = new URLSearchParams(location.hash.substr(location.hash.indexOf("?"))).get("token");

  useEffect(() => {
    Promise.all([setRefresh(""), setAccess(""), setPassword("")]).then(() => {
      removeCookie("refresh");
      removeCookie("session");
    });
    if (!token) {
      notify("user.reset_password.error", "error");
      history.push("/recover-password");
    }
  }, []);

  function handleSubmit(auth: FormValues) {
    setLoading(true);

    fetch(`${location.origin}/api/v1/reset-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        new_password: auth.password,
      }),
    })
      .then((res) => {
        console.debug("Resetting password was", res.ok);
        notify("user.reset_password.success", "success");
        history.push("/login");
      })
      .catch((error: Error) => {
        setLoading(false);
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
            ? "user.reset_password.error"
            : error.message,
          "warning",
          {
            _:
              typeof error === "string"
                ? error
                : error && error.message
                ? error.message
                : undefined,
          },
        );
      });
  }

  function validate(values: FormValues) {
    const errors: FormValues = {};
    if (!values.password) {
      errors.password = translate("ra.validation.required");
    }
    if (!values.repeatPassword) {
      errors.repeatPassword = translate("ra.validation.required");
    }
    if (values.password !== values.repeatPassword) {
      errors.password = translate("user.reset_password.passwords_different");
    }
    if (!token) {
      history.push("/recover-password");
    }

    return errors;
  }

  const helpUrl = "https://transcrob.es";
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
                    name="password"
                    // @ts-ignore
                    component={renderInput}
                    label={translate("user.reset_password.password")}
                    disabled={loading}
                  />
                </div>
                <OnChange name="password">
                  {(value) => {
                    setLocalPassword(value);
                  }}
                </OnChange>
              </div>
              <div className={classes.form}>
                <div className={classes.input}>
                  <PasswordStrengthBar
                    minLength={8}
                    onChangeScore={(score) => setPasswordScore(score)}
                    password={password}
                  />
                </div>
              </div>
              <div className={classes.form}>
                <div className={classes.input}>
                  <Field
                    name="repeatPassword"
                    // @ts-ignore
                    component={renderInput}
                    label={translate("user.reset_password.repeat_password")}
                    disabled={loading}
                  />
                </div>
              </div>
              <CardActions className={classes.actions}>
                <Button
                  variant="contained"
                  type="submit"
                  color="primary"
                  disabled={loading || passwordScore < 3}
                  fullWidth
                >
                  {loading && <CircularProgress size={25} thickness={2} />}
                  {translate("user.reset_password.label")}
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
                    <Link to="/signup">{translate("user.signup")}</Link>
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

export default ResetPassword;
