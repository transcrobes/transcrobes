import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import * as React from "react";
import { useTranslate } from "react-admin";
import { useNavigate } from "react-router-dom";

export default function MinEntryComplete() {
  const [open, setOpen] = React.useState(true);
  const navigate = useNavigate();
  const translate = useTranslate();

  function handleClose() {
    setOpen(false);
  }

  function handleBrocrobes() {
    navigate("/brocrobes");
    setOpen(false);
  }

  function handleTextcrobes() {
    navigate("/textcrobes");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{translate("screens.listrobes.minimum_entry_complete.title")}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {translate("screens.listrobes.minimum_entry_complete.message")}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{translate("screens.listrobes.minimum_entry_complete.continue_training")}</Button>
        <Button onClick={handleBrocrobes}>{translate("screens.listrobes.minimum_entry_complete.try_brocrobes")}</Button>
        <Button onClick={handleTextcrobes} autoFocus>
          {translate("screens.listrobes.minimum_entry_complete.try_textcrobes")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
