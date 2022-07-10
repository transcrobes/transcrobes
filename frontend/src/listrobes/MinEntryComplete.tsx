import { Link } from "@mui/material";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BROCROBES_WEB_STORE_URL } from "../lib/types";

export default function MinEntryComplete() {
  const [open, setOpen] = React.useState(true);
  const navigate = useNavigate();

  function handleClose() {
    setOpen(false);
  }

  function handleBrocrobes() {
    window.open(BROCROBES_WEB_STORE_URL, "_blank");
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
      <DialogTitle id="alert-dialog-title">{"Minimum recommended training complete"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Now you've told the system a little about yourself, you can start using the platform. If you still know lots
          of words, you can continue training now, or come back and finish later. To start reading we recommend you try
          out the Chrome browser extension Brocrobes, or if you want to type or paste text, you can try out Textcrobes.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Continue training?</Button>
        <Button onClick={handleBrocrobes}>Try Brocrobes?</Button>
        <Button onClick={handleTextcrobes} autoFocus>
          Try Textcrobes?
        </Button>
      </DialogActions>
    </Dialog>
  );
}
