import Slider, { ValueLabelProps } from "@material-ui/core/Slider";
import { createStyles, Theme, withStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import { ReactElement } from "react";

const sliderStyles = createStyles((theme: Theme) => ({
  thumb: {
    [theme.breakpoints.down("sm")]: {
      height: 12,
      width: 12,
    },
    [theme.breakpoints.up("sm")]: {
      height: 24,
      width: 24,
      marginTop: -8,
      marginLeft: -12,
    },
    backgroundColor: "#fff",
    border: "2px solid currentColor",
    "&:focus, &:hover, &$active": {
      boxShadow: "inherit",
    },
  },
  active: {},
  valueLabel: {
    left: "calc(-50% + 4px)",
  },
  [theme.breakpoints.down("sm")]: {
    root: {
      height: 4,
      padding: "10px 0",
    },
    track: {
      height: 4,
      borderRadius: 2,
    },
    rail: {
      height: 4,
      borderRadius: 2,
    },
  },
  [theme.breakpoints.up("sm")]: {
    root: {
      height: 8,
    },
    track: {
      height: 8,
      borderRadius: 4,
    },
    rail: {
      height: 8,
      borderRadius: 4,
    },
  },
}));

export function ValueLabelComponent({ children, open, value }: ValueLabelProps): ReactElement {
  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  );
}

const PrettoSlider = withStyles(sliderStyles)(Slider);

export default PrettoSlider;
