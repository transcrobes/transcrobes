import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Box } from "@mui/system";
import { useRedirect, useTranslate } from "react-admin";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { setIgnoreBeginner } from "../features/ui/uiSlice";
import { MIN_KNOWN_BEFORE_ADVANCED } from "../lib/types";

function shouldRedirectBeginner(url: string): boolean {
  const m = url.slice(1);
  if (
    m &&
    (m.startsWith("login") ||
      m.startsWith("init") ||
      m.startsWith("signup") ||
      m.startsWith("reset-password") ||
      m.startsWith("imports") ||
      m.startsWith("listrobes") ||
      m.startsWith("recover-password"))
  ) {
    return false;
  } else {
    return true;
  }
}

export default function AlertDialog() {
  const dispatch = useAppDispatch();
  const loc = useLocation();
  const redirect = useRedirect();
  const translate = useTranslate();

  const show = useAppSelector((state) => {
    return (
      !state.userData.user.isTeacher &&
      !state.userData.user.isAdmin &&
      !state.ui.ignoreBeginner &&
      shouldRedirectBeginner(loc.pathname) &&
      !!state.ui.needsBeginner
    );
  });
  function handleIgnore() {
    dispatch(setIgnoreBeginner(true));
  }
  function handleRedirect(destination: string) {
    redirect(`/${destination}`);
  }

  const buttonSx = {
    margin: "0.5rem",
    width: "100%",
  };
  return (
    <Dialog open={show} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
      <DialogTitle id="alert-dialog-title">{translate("widgets.beginners.title")}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">{translate("widgets.beginners.intro")}</DialogContentText>
      </DialogContent>
      <Box
        sx={{
          display: "flex",
        }}
      >
        <Button
          color="success"
          size="large"
          sx={buttonSx}
          variant="contained"
          onClick={() => handleRedirect("listrobes")}
          autoFocus
        >
          {translate("widgets.beginners.button_interface")}
        </Button>
        <Button size="large" sx={buttonSx} variant="contained" onClick={() => handleRedirect("imports")}>
          {translate("widgets.beginners.button_import")}
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button size="small" onClick={handleIgnore}>
          {translate("widgets.beginners.button_later")}
        </Button>
      </Box>
    </Dialog>
  );
}
