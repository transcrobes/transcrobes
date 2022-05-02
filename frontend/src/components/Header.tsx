import { makeStyles } from "tss-react/mui";
import { ReactElement } from "react";

const useStyles = makeStyles()(() => ({
  header: { marginBlockStart: ".5em", marginBlockEnd: ".5em" },
}));

export default function Header({ text }: { text: string }): ReactElement {
  const { classes } = useStyles();
  return (
    <div>
      <h4 className={classes.header}>{text}</h4>
    </div>
  );
}
