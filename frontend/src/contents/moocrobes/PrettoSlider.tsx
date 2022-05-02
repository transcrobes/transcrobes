import Slider from "@mui/material/Slider";
import { Theme } from "@mui/material/styles";
import { withStyles } from "tss-react/mui";
import Tooltip from "@mui/material/Tooltip";
import { ReactElement } from "react";
import { ValueLabelProps } from "@mui/base";

const sliderStyles = (theme: Theme) => ({
  thumb: {
    [theme.breakpoints.down("md")]: {
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
  [theme.breakpoints.down("md")]: {
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
});

const PrettoSlider = withStyles(Slider, sliderStyles);
export default PrettoSlider;

export function ValueLabelComponent({ children, open, value }: ValueLabelProps): ReactElement {
  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  );
}
