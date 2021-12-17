import { ReactElement, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Field, withTypes } from "react-final-form";
import { Link, useLocation } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CircularProgress,
  TextField,
  Typography,
} from "@material-ui/core";
import { createMuiTheme, makeStyles } from "@material-ui/core/styles";
import { ThemeProvider } from "@material-ui/styles";
import LockIcon from "@material-ui/icons/Lock";
import { Notification, useTranslate, useLogin, useNotify } from "react-admin";
import { lightTheme } from "../layout/themes";
import { isInitialisedAsync } from "../lib/JWTAuthProvider";

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
  username?: string;
  password?: string;
}

const { Form } = withTypes<FormValues>();

const messages = {
  "001": "Email validated successfully",
  "002": "Email validation error, please contact anton@transcrob.es",
  "003": "Email validation expired, please contact anton@transcrob.es",
};

function Login(): ReactElement {
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();
  const classes = useStyles();
  const notify = useNotify();
  const login = useLogin();
  const location = useLocation<{ nextPathname: string } | null>();

  const incomingMessageId = new URLSearchParams(location.search).get("msg");

  useEffect(() => {
    if (incomingMessageId) {
      notify(
        messages[incomingMessageId as keyof typeof messages],
        incomingMessageId === "001" ? "success" : "error",
      );
    }
  }, []);

  async function handleSubmit(auth: FormValues) {
    setLoading(true);
    const username = auth.username;
    if (!username) throw new Error("A username is required here"); // should be impossible
    const nextPath = (await isInitialisedAsync(username))
      ? location.state
        ? location.state.nextPathname
        : "/"
      : "/init";
    login(auth, nextPath).catch((error: Error) => {
      setLoading(false);
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
          ? "ra.auth.sign_in_error"
          : error.message,
        "warning",
        {
          _: typeof error === "string" ? error : error && error.message ? error.message : undefined,
        },
      );
    });
  }

  function validate(values: FormValues) {
    const errors: FormValues = {};
    if (!values.username) {
      errors.username = translate("ra.validation.required");
    }
    if (!values.password) {
      errors.password = translate("ra.validation.required");
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
                  <LockIcon />
                </Avatar>
              </div>
              <div className={classes.form}>
                <div className={classes.input}>
                  <Field
                    autoFocus
                    name="username"
                    // @ts-ignore
                    label={translate("ra.auth.username")}
                    disabled={loading}
                  >
                    {({
                      meta: { touched, error } = { touched: false, error: undefined },
                      input: { ...inputProps },
                      ...props
                    }) => {
                      return (
                        <TextField
                          id="username"
                          autoComplete="username"
                          error={!!(touched && error)}
                          helperText={touched && error}
                          {...inputProps}
                          {...props}
                          fullWidth
                        />
                      );
                    }}
                  </Field>
                </div>
                <div className={classes.input}>
                  <Field
                    name="password"
                    // @ts-ignore
                    label={translate("ra.auth.password")}
                    type="password"
                    disabled={loading}
                  >
                    {({
                      meta: { touched, error } = { touched: false, error: undefined },
                      input: { ...inputProps },
                      ...props
                    }) => {
                      return (
                        <TextField
                          id="current-password"
                          autoComplete="current-password"
                          error={!!(touched && error)}
                          helperText={touched && error}
                          {...inputProps}
                          {...props}
                          fullWidth
                        />
                      );
                    }}
                  </Field>
                </div>
              </div>
              <CardActions className={classes.actions}>
                <Button
                  variant="contained"
                  type="submit"
                  color="primary"
                  disabled={loading}
                  fullWidth
                >
                  {loading && <CircularProgress size={25} thickness={2} />}
                  {translate("ra.auth.sign_in")}
                </Button>
              </CardActions>
              <div>
                <div className={classes.userManagement}>
                  <Typography>
                    <Link to="/recover-password">{translate("user.reset_password.label")}</Link>
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

Login.propTypes = {
  authProvider: PropTypes.func,
  previousRoute: PropTypes.string,
};

// We need to put the ThemeProvider decoration in another component
// Because otherwise the useStyles() hook used in Login won't get
// the right theme
function LoginWithTheme(props: any): ReactElement {
  return (
    <ThemeProvider theme={createMuiTheme(lightTheme)}>
      <Login {...props} />
    </ThemeProvider>
  );
}

export default LoginWithTheme;
