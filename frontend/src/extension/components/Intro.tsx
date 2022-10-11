import { Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useTranslate } from "react-admin";

export default function Intro({ inited }: { inited: boolean }) {
  const translate = useTranslate();
  return !inited ? (
    <Box sx={(theme) => ({ margin: theme.spacing(2) })}>
      <Typography variant="h4">{translate("screens.extension.initialisation.title")}</Typography>
      <Typography>{translate("screens.extension.initialisation.intro_a")}</Typography>
      <Typography>{translate("screens.extension.initialisation.intro_b")}</Typography>
    </Box>
  ) : (
    <Box sx={(theme) => ({ margin: theme.spacing(2) })}>
      <Typography variant="h4">{translate("screens.extension.initialisation.update")}</Typography>
      <Typography>{translate("screens.extension.initialisation.update_message")}</Typography>
    </Box>
  );
}
