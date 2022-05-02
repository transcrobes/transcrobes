import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import { ReactElement } from "react";
import { HslColor, HslColorPicker } from "react-colorful";

export interface FontColourProps {
  className: string;
  value: HslColor;
  label: string;
  onValueChange: (value: HslColor) => void;
}

function FontColour({ className, label, value, onValueChange }: FontColourProps): ReactElement {
  return (
    <Box my={1}>
      <Typography className={className} variant="h4" component="h1" gutterBottom>
        {label}
      </Typography>
      <HslColorPicker color={value} onChange={onValueChange} />
    </Box>
  );
}

export default FontColour;
