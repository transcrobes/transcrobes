import ReplayIcon from "@mui/icons-material/Replay";
import { Avatar, Box, Button, Card, CardActions, CircularProgress, TextField, Typography } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { Notification, useNotify, useTranslate } from "react-admin";
import { useCookies } from "react-cookie";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { useNavigate } from "react-router";
import { Link } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import PasswordStrengthBar from "../components/PasswordStrengthBar";
import { throttledLogout } from "../features/user/userSlice";
import { DOCS_DOMAIN } from "../lib/types";

interface FormValues {
  password?: string;
  repeatPassword?: string;
}

const stdPadding = {
  padding: "0 1em 1em 1em",
};
const stdMargin = {
  marginTop: "1em",
};

function ResetPassword(): ReactElement {
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();
  const notify = useNotify();
  const navigate = useNavigate();
  const [passwordScore, setPasswordScore] = useState(0);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [_cookies, _setCookie, removeCookie] = useCookies(["refresh", "session"]);
  const token = new URLSearchParams(location.hash.substr(location.hash.indexOf("?"))).get("token");
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(throttledLogout() as any);
    removeCookie("refresh");
    removeCookie("session");

    if (!token) {
      notify("user.reset_password.error", { type: "error" });
      navigate("/recover-password");
    }
  }, []);

  function onSuccess(auth: FormValues) {
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
        notify("user.reset_password.success", { type: "success" });
        navigate("/login");
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
        );
      });
  }

  const helpUrl = `//${DOCS_DOMAIN}`;

  return (
    <FormContainer defaultValues={{ password: "", repeatPassword: "" }} onSuccess={onSuccess}>
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
              <ReplayIcon />
            </Avatar>
          </Box>
          <Box sx={{ ...stdPadding, ...stdMargin }}>
            <TextFieldElement
              fullWidth
              disabled={loading}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              name="password"
              label={translate("ra.auth.password")}
              type="password"
              required
            />
          </Box>
          <Box sx={{ ...stdPadding, ...stdMargin }}>
            <PasswordStrengthBar minLength={8} onChangeScore={(score) => setPasswordScore(score)} password={password} />
          </Box>
          <Box sx={{ ...stdPadding, ...stdMargin }}>
            <TextFieldElement
              fullWidth
              disabled={loading}
              name="repeatPassword"
              error={password !== repeatPassword}
              helperText={password !== repeatPassword ? translate("user.reset_password.passwords_different") : ""}
              onChange={(e) => {
                setRepeatPassword(e.target.value);
              }}
              label={translate("user.reset_password.repeat_password")}
              type="password"
              required
            />
          </Box>
          <CardActions sx={stdPadding}>
            <Button
              variant="contained"
              type="submit"
              color="primary"
              disabled={loading || passwordScore < 3 || password !== repeatPassword}
              fullWidth
            >
              {loading && <CircularProgress size={25} thickness={2} />}
              {translate("user.reset_password.label")}
            </Button>
          </CardActions>
          <div>
            <Box sx={stdPadding}>
              <Typography>
                <Link to="/login">{translate("ra.auth.sign_in")}</Link>
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

export default ResetPassword;
