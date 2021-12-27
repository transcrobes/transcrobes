import { ReactElement } from "react";
import Box from "@material-ui/core/Box";
import { HslColorPicker, HslColor } from "react-colorful";
import { Typography } from "@material-ui/core";

export interface SubFontColourProps {
  classes: any;
  value: HslColor;
  onValueChange: (value: HslColor) => void;
}

function SubFontColour({ classes, value, onValueChange }: SubFontColourProps): ReactElement {
  return (
    <Box my={4}>
      <Typography className={classes.fineControlIcons} variant="h4" component="h1" gutterBottom>
        Subs colour
      </Typography>
      <HslColorPicker color={value} onChange={onValueChange} />
    </Box>
  );
}

export default SubFontColour;
