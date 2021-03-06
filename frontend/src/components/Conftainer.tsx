import InputLabel from "@mui/material/InputLabel";
import NotchedOutline from "@mui/material/OutlinedInput/NotchedOutline";
import { Theme } from "@mui/material/styles";
import { makeStyles } from "tss-react/mui";
import React, { ReactElement, ReactNode } from "react";

const useStyles = makeStyles()((theme: Theme) => ({
  root: {
    position: "relative",
    margin: theme.spacing(2),
  },
  contentWrapper: {
    position: "relative",
  },
  content: {
    textAlign: "center",
    padding: theme.spacing(1),
  },
  inputLabel: {
    position: "absolute",
    left: 0,
    top: 0,
    // slight alteration to spec spacing to match visual spec result
    // transform: "translate(0, 24px) scale(1)",
  },
  notchedOutline: { borderRadius: theme.shape.borderRadius },
}));

interface Props {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}

export default function Conftainer({ id, label, children, className }: Props): ReactElement {
  const [labelWidth, setLabelWidth] = React.useState(0);
  const labelRef = React.useRef(null);
  React.useEffect(() => {
    if (labelRef && labelRef.current && (labelRef.current as any).offsetWidth) {
      setLabelWidth((labelRef.current as any).offsetWidth);
    }
  }, [label]);
  const { classes, cx } = useStyles();
  return (
    <div className={cx(className, classes.root)}>
      <InputLabel ref={labelRef} htmlFor={id} variant="outlined" className={classes.inputLabel} shrink>
        {label}
      </InputLabel>
      <div className={classes.contentWrapper}>
        <div id={id} className={classes.content}>
          {children}
          {/* <NotchedOutline className={classes.notchedOutline} notched labelWidth={labelWidth} /> */}
          <NotchedOutline className={classes.notchedOutline} notched label={label} />
        </div>
      </div>
    </div>
  );
}
