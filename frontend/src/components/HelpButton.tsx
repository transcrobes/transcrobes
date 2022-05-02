import { makeStyles } from "tss-react/mui";
import HelpIcon from "@mui/icons-material/HelpOutline";
import { Button } from "ra-ui-materialui";
import { ReactElement } from "react";

interface Props {
  url: string;
  text?: string;
  size?: "small" | "medium" | "large";
}

const useStyles = makeStyles()({
  button: { marginLeft: ".2em" },
});

export default function HelpButton({ url, text, size }: Props): ReactElement {
  const { classes } = useStyles();
  return (
    <Button
      onClick={() => window.open(url, "_blank")}
      className={classes.button}
      size={size}
      children={<HelpIcon />}
      variant="text"
      label={text || "Online Help"}
    />
  );
}
