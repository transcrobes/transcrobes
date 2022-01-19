import { ReactElement } from "react";
import Box from "@material-ui/core/Box";
import { HslColorPicker, HslColor } from "react-colorful";
import { Typography } from "@material-ui/core";

export interface FontColourProps {
  classes: any;
  value: HslColor;
  label: string;
  onValueChange: (value: HslColor) => void;
}

function FontColour({ classes, label, value, onValueChange }: FontColourProps): ReactElement {
  return (
    <Box my={1}>
      <Typography className={classes.fineControlIcons} variant="h4" component="h1" gutterBottom>
        {label}
      </Typography>
      <HslColorPicker color={value} onChange={onValueChange} />
    </Box>
  );
}

export default FontColour;
