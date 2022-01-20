import { Typography } from "@material-ui/core";
import Box from "@material-ui/core/Box";
import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import { ReactElement } from "react";
import { HslColor, HslColorPicker } from "react-colorful";

export interface FontColourProps {
  classes: ClassNameMap<"fineControlIcons">;
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
