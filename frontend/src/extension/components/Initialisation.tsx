import { Typography } from "@mui/material";
import { useTranslate } from "react-admin";

export default function Initialisation() {
  const translate = useTranslate();
  return (
    <>
      <Typography variant="h4">{translate("screens.extension.initialisation.started")}</Typography>
      <Typography>{translate("screens.extension.initialisation.started_message")}</Typography>
    </>
  );
}
