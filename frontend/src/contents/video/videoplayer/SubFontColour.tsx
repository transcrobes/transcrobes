import { ReactElement } from "react";
import Container from "@material-ui/core//Container";
import { Color, ColorPicker } from "material-ui-color";
import Box from "@material-ui/core/Box";

export interface SubFontColourProps {
  classes: any;
  value: Color;
  onValueChange: (value: Color) => void;
}

function SubFontColour({ classes, value, onValueChange }: SubFontColourProps): ReactElement {
  return (
    <Container maxWidth="sm">
      <Box my={4}>
        {/* <Typography className={classes.fineControlIcons} variant="h4" component="h1" gutterBottom>
          Subs colour
        </Typography> */}
        <div
          title="Subs colour"
          style={{ backgroundColor: "white" }}
          className={classes.fineControlIcons}
        >
          <ColorPicker value={value} onChange={onValueChange} />
        </div>
      </Box>
    </Container>
  );
}

export default SubFontColour;
