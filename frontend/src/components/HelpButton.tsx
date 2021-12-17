import { ReactElement } from "react";
import { Button } from "ra-ui-materialui";
import HelpIcon from "@material-ui/icons/HelpOutline";
import { makeStyles } from "@material-ui/core";

interface Props {
  url: string;
  text?: string;
}

const useStyles = makeStyles((theme) => ({
  button: { marginLeft: ".2em" },
}));

export default function HelpButton({ url, text }: Props): ReactElement {
  const classes = useStyles();
  return (
    <a className={classes.button} target="_blank" href={url}>
      <Button children={<HelpIcon />} variant="text" label={text || "Online Help"} />
    </a>
  );
}
