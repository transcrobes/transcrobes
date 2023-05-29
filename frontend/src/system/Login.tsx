import LockIcon from "@mui/icons-material/Lock";
import { Avatar, Box, Button, Card, CardActions, CircularProgress, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { ReactElement, useEffect, useState } from "react";
import { Notification, useLogin, useNotify, useTranslate } from "react-admin";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { Link, useLocation } from "react-router-dom";
import NolayoutWrapper from "../components/NolayoutWrapper";
import { isInitialisedAsync } from "../database/authdb";
import { ADMIN_EMAILS, DOCS_DOMAIN } from "../lib/types";

const stdPadding = {
  padding: "0 1em 1em 1em",
};
const stdMargin = {
  marginTop: "1em",
};

interface FormValues {
  email?: string;
  password?: string;
}

function Login(): ReactElement {
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();
  const notify = useNotify();
  const login = useLogin();
  const location = useLocation();

  const incomingMessageId = new URLSearchParams(location.search).get("msg");

  const messages = {
    "001": translate("user.login.messages.001"),
    "002": translate("user.login.messages.002", { admin_emails: ADMIN_EMAILS.join(" or ") }),
    "003": translate("user.login.messages.003", { admin_emails: ADMIN_EMAILS.join(" or ") }),
  };

  useEffect(() => {
    if (incomingMessageId) {
      notify(messages[incomingMessageId as keyof typeof messages], {
        type: incomingMessageId === "001" ? "success" : "error",
      });
    }
  }, []);

  async function onSuccess(auth: FormValues) {
    setLoading(true);
    const username = auth.email;
    if (!username) throw new Error("A username is required here"); // should be impossible
    const nextPath = (await isInitialisedAsync(username))
      ? location.state
        ? (location.state as any).nextPathname
        : "/"
      : "/init";
    login({ username, password: auth.password }, nextPath).catch((error: Error) => {
      setLoading(false);
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !error.message
          ? "ra.auth.sign_in_error"
          : error.message,
        { type: "warning" },
        // {
        //   _: typeof error === "string" ? error : error && error.message ? error.message : undefined,
        // },
      );
    });
  }

  const helpUrl = `//${DOCS_DOMAIN}`;
  return (
    <FormContainer defaultValues={{ email: "", password: "" }} onSuccess={onSuccess}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "flex-start",
          background: "url(https://source.unsplash.com/random/1600x900/?china)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <Card sx={{ minWidth: 300, marginTop: "6em" }}>
          <Box sx={{ margin: "1em", display: "flex", justifyContent: "center" }}>
            <Avatar sx={{ backgroundColor: "secondary.main" }}>
              <LockIcon />
            </Avatar>
          </Box>
          <Box sx={{ ...stdPadding, ...stdMargin }}>
            <TextFieldElement
              fullWidth
              disabled={loading}
              name="email"
              label={translate("user.email")}
              type="email"
              required
            />
          </Box>
          <Box sx={{ ...stdPadding, ...stdMargin }}>
            <TextFieldElement
              fullWidth
              disabled={loading}
              name="password"
              label={translate("ra.auth.password")}
              type="password"
              required
            />
          </Box>
          <CardActions sx={stdPadding}>
            <Button variant="contained" type="submit" color="primary" disabled={loading} fullWidth>
              {loading && <CircularProgress size={25} thickness={2} />}
              {translate("ra.auth.sign_in")}
            </Button>
          </CardActions>
          <div>
            <Box sx={stdPadding}>
              <Typography>
                <Link to="/recover-password">{translate("user.reset_password.label")}</Link>
              </Typography>
            </Box>
            <Box sx={stdPadding}>
              <Typography>
                <Link to="/signup">{translate("user.signup.label")}</Link>
              </Typography>
            </Box>
            <Box sx={stdPadding}>
              <Typography>
                <a target={"_blank"} href={helpUrl}>
                  {translate("user.help.site")}
                </a>
              </Typography>
            </Box>
          </div>
        </Card>
        <Notification />
      </Box>
    </FormContainer>
  );
}

Login.propTypes = {
  authProvider: PropTypes.func,
  previousRoute: PropTypes.string,
};

function LoginWithTheme(props: any): ReactElement {
  return (
    <NolayoutWrapper {...props}>
      <Login {...props} />
    </NolayoutWrapper>
  );
}

export default LoginWithTheme;
