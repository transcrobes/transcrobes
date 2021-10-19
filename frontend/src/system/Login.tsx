import { ReactElement, useState } from "react";
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

function renderInput({
  meta: { touched, error } = { touched: false, error: undefined },
  input: { ...inputProps },
  ...props
}): ReactElement {
  return (
    <TextField
      error={!!(touched && error)}
      helperText={touched && error}
      {...inputProps}
      {...props}
      fullWidth
    />
  );
}

interface FormValues {
  username?: string;
  password?: string;
}

const { Form } = withTypes<FormValues>();

function Login(): ReactElement {
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();
  const classes = useStyles();
  const notify = useNotify();
  const login = useLogin();
  const location = useLocation<{ nextPathname: string } | null>();

  function handleSubmit(auth: FormValues) {
    setLoading(true);
    login(auth, location.state ? location.state.nextPathname : "/").catch((error: Error) => {
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
                    component={renderInput}
                    label={translate("ra.auth.username")}
                    disabled={loading}
                  />
                </div>
                <div className={classes.input}>
                  <Field
                    name="password"
                    // @ts-ignore
                    component={renderInput}
                    label={translate("ra.auth.password")}
                    type="password"
                    disabled={loading}
                  />
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
                    <Link to="/reset-password">{translate("user.reset_password.label")}</Link>
                  </Typography>
                </div>
                <div className={classes.userManagement}>
                  <Typography>
                    <Link to="/signup">{translate("user.signup")}</Link>
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
