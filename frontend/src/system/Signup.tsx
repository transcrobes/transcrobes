import AddIcon from "@mui/icons-material/Add";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ReactElement, useState } from "react";
import { Notification, useNotify, useTranslate } from "react-admin";
import { Field, withTypes } from "react-final-form";
import { OnChange } from "react-final-form-listeners";
import { Link } from "react-router-dom";
import { makeStyles } from "tss-react/mui";
import PasswordStrengthBar from "../components/PasswordStrengthBar";
import WatchDemo from "../components/WatchDemo";
import { DOCS_DOMAIN, SIGNUP_YT_VIDEO } from "../lib/types";

const emailRegex =
  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

const useStyles = makeStyles()((theme) => ({
  help: {},
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
    marginTop: "6em",
    maxWidth: 600,
  },
  avatar: {
    margin: "1em",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
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
  email?: string;
  username?: string;
  password?: string;
  repeatPassword?: string;
  consent?: boolean;
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

export default function Signup(): ReactElement {
  const [loading, setLoading] = useState(false);
  const [creationSent, setCreationSent] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordScore, setPasswordScore] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailValid, setEmailValid] = useState(false);

  const translate = useTranslate();
  const { classes } = useStyles();
  const notify = useNotify();

  function handleSubmit(form: FormValues) {
    setLoading(true);

    // FIXME: hardcoded url
    fetch(`${location.origin}/api/v1/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: form.email,
        username: form.email,
        password: form.password,
      }),
    })
      .then((res) => {
        if (res.ok) {
          notify("user.signup.email_success", { type: "success" });
          setCreationSent(true);
        } else {
          throw new Error("Error creating the user.");
        }
      })
      .catch((error: Error) => {
        setLoading(false);
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
            ? "user.signup.error"
            : error.message,
          { type: "warning" },
          // "warning",
          // {
          //   _: typeof error === "string" ? error : error && error.message ? error.message : undefined,
          // },
        );
      });
  }

  function emailIsValid(email: string) {
    return emailRegex.test(email);
  }

  function validate(values: FormValues) {
    const errors: FormValues = {};
    if (!values.email) {
      errors.email = translate("ra.validation.required");
    } else {
      if (!emailIsValid(values.email)) {
        errors.email = translate("user.invalid_email");
      }
    }
    if (!values.password) {
      errors.password = translate("ra.validation.required");
    }
    if (!values.repeatPassword) {
      errors.repeatPassword = translate("ra.validation.required");
    }
    if (values.password !== values.repeatPassword) {
      errors.password = translate("user.reset_password.passwords_different");
    }
    if (!values.consent) {
      errors.consent = false;
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
                  <AddIcon />
                </Avatar>
                <WatchDemo url={SIGNUP_YT_VIDEO} size="large" />
              </div>
              {!creationSent && (
                <>
                  <div className={classes.form}>
                    <div className={classes.input}>
                      <Field
                        autoFocus
                        name="email"
                        // @ts-ignore
                        component={renderInput}
                        type="email"
                        label={translate("user.email")}
                        disabled={loading}
                      />
                      <OnChange name="email">
                        {(value) => {
                          setEmailValid(emailIsValid(value));
                        }}
                      </OnChange>
                    </div>
                  </div>
                  <div className={classes.form}>
                    <div className={classes.input}>
                      <Field
                        name="password"
                        // @ts-ignore
                        component={renderInput}
                        type="password"
                        label={translate("user.reset_password.password")}
                        disabled={loading}
                      />
                      <OnChange name="password">
                        {(value) => {
                          setPassword(value);
                        }}
                      </OnChange>
                    </div>
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
                        type="password"
                        label={translate("user.reset_password.repeat_password")}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className={classes.form}>
                    <div className={classes.input}>
                      <Typography>
                        <label>
                          I agree with the{" "}
                          <a href="/static/consent.html" target="_blank">
                            Research Consent Terms
                          </a>
                        </label>
                      </Typography>
                      <Field name="consent" component="input" type="checkbox" />
                      <OnChange name="consent">
                        {(value) => {
                          setAcceptedTerms(value);
                        }}
                      </OnChange>
                    </div>
                  </div>
                  <CardActions className={classes.actions}>
                    <Button
                      variant="contained"
                      type="submit"
                      color="primary"
                      disabled={loading || passwordScore < 3 || !acceptedTerms || !emailValid}
                      fullWidth
                    >
                      {loading && <CircularProgress size={25} thickness={2} />}
                      {translate("user.signup.label")}
                    </Button>
                  </CardActions>
                </>
              )}
              {creationSent && (
                <div className={classes.userManagement}>
                  <Typography>
                    A validation email has been sent to the email address provided. Please validate this email by
                    clicking in the link in the email.
                  </Typography>
                </div>
              )}
              <div>
                <div className={classes.userManagement}>
                  <Typography>
                    <Link to="/login">{translate("ra.auth.sign_in")}</Link>
                  </Typography>
                </div>
                <div className={classes.userManagement}>
                  <Typography>
                    <Link to="/recover-password">{translate("user.reset_password.label")}</Link>
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
