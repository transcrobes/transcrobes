import { ReactElement, useEffect, useState } from "react";
import { Notification, useTranslate, useNotify } from "react-admin";
import { useHistory } from "react-router";
import { makeStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import Typography from "@material-ui/core/Typography";
import { Link } from "react-router-dom";
import CircularProgress from "@material-ui/core/CircularProgress";

const useStyles = makeStyles(() => ({
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
  userManagement: {
    padding: "0 1em 1em 1em",
  },
}));

function ValidateEmail(): ReactElement {
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();
  const classes = useStyles();
  const notify = useNotify();
  const history = useHistory();

  useEffect(() => {
    setLoading(true);
    const token = new URLSearchParams(location.hash.substr(location.hash.indexOf("?"))).get(
      "token",
    );
    fetch(`${location.origin}/api/v1/validate-email/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        r: "",
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("There was an issue validating the email");
        }
        notify("user.email_validated", "success");
        setLoading(false);
        history.push("/login");
      })
      .catch((error: Error) => {
        setLoading(false);
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
            ? "user.validate_email_error"
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
  }, []);

  return (
    <div className={classes.main}>
      <Card className={classes.card}>
        {loading && <CircularProgress size={100} thickness={5} />}
        <div className={classes.userManagement}>
          <Typography>{translate("user.validating_email")}</Typography>
        </div>
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
        </div>
      </Card>
      <Notification />
    </div>
  );
}

export default ValidateEmail;
