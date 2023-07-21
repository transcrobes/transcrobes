import { Backdrop, Box, Fade, Modal, Typography } from "@mui/material";
import * as Comlink from "comlink";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Runtime } from "webextension-polyfill";
import type { BackgroundWorkerManager } from "./backgroundfn";
import { createEndpoint } from "./lib/adapter";

const proxy = Comlink.wrap<BackgroundWorkerManager>(createEndpoint(chrome.runtime.connect() as Runtime.Port));

function ImportPopup() {
  const [open, setOpen] = useState(true);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");
  function handleClose() {
    setOpen(false);
  }
  useEffect(() => {
    (async () => {
      const { data } = await proxy.getImportMessage();
      if (data.status === "ongoing") {
        setOpen(true);
      }
      setMessage(data.message);
      setTimeout(() => {
        setCount(count + 1);
      }, 1000);
    })();
  }, [count]);
  return (
    <div>
      <Modal
        aria-labelledby="import-modal-title"
        aria-describedby="import-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={open}>
          <Box
            sx={{
              position: "absolute" as "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              border: "2px solid #000",
              boxShadow: 24,
              p: 4,
            }}
          >
            <Typography id="transition-modal-title" variant="h6" component="h2">
              {message}
            </Typography>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}
createRoot(document.body.appendChild(document.createElement("div"))!).render(<ImportPopup />);
