import ReplayIcon from "@mui/icons-material/Replay";
import { Avatar, Box, Button, Card, CardActions, CircularProgress, Typography } from "@mui/material";
import { ReactElement } from "react";
import { Notification, useNotify, useTranslate } from "react-admin";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { DOCS_DOMAIN } from "../lib/types";
import { setLoading } from "../features/ui/uiSlice";

const stdPadding = {
  padding: "0 1em 1em 1em",
};
const stdMargin = {
  marginTop: "1em",
};

interface FormValues {
  email?: string;
}

export default function RecoverPassword(): ReactElement {
  const loading = useAppSelector((state) => state.ui.loading);
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  const notify = useNotify();

  function handleSubmit(auth: FormValues) {
    dispatch(setLoading(true));
    fetch(`${location.origin}/api/v1/password-recovery/${auth.email}`, { method: "POST" })
      .then(() => {
        notify("user.reset_password.email_success", { type: "success" });
        dispatch(setLoading(false));
      })
      .catch((error: Error) => {
        dispatch(setLoading(false));
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
  const helpUrl = `//${DOCS_DOMAIN}`;

  return (
    <FormContainer defaultValues={{ email: "" }} onSuccess={handleSubmit}>
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
              name="email"
              label={translate("user.email")}
              type="email"
              required
            />
          </Box>
          <CardActions sx={stdPadding}>
            <Button variant="contained" type="submit" color="primary" disabled={loading} fullWidth>
              {loading && <CircularProgress size={25} thickness={2} />}
              {translate("user.reset_password.recover")}
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
