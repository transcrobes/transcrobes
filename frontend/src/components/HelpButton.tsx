import HelpIcon from "@mui/icons-material/HelpOutline";
import { Button } from "ra-ui-materialui";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";

interface Props {
  url: string;
  text?: string;
  size?: "small" | "medium" | "large";
}

export default function HelpButton({ url, text, size }: Props): ReactElement {
  const translate = useTranslate();
  return (
    <Button
      onClick={() => window.open(url, "_blank")}
      sx={{ marginLeft: ".2em" }}
      size={size}
      children={<HelpIcon />}
      variant="text"
      label={text || translate("buttons.general.online_help")}
    />
  );
}
