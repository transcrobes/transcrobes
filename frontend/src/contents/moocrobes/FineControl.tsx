import { ReactElement } from "react";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import AddIcon from "@material-ui/icons/Add";
import RemoveIcon from "@material-ui/icons/Remove";
import { Properties } from "csstype";
import { FormControl, FormLabel } from "@material-ui/core";

export interface FineControlImplProps {
  classes: Properties;
  label?: string;
  increment?: number;
  value: number;
  onValueChange: (value: number) => void;
}

interface Props {
  title: string;
  value: number;
  isPercent: boolean;
  labelLess: string;
  labelMore: string;
  cssClasses: any; // FIXME: any
  onMore: () => void;
  onLess: () => void;
}

function FineControl({
  title,
  value,
  isPercent,
  labelLess,
  labelMore,
  cssClasses,
  onLess,
  onMore,
}: Props): ReactElement {
  if (cssClasses)
    return (
      <FormControl component="fieldset">
        <FormLabel component="legend">{title}</FormLabel>
        <div title={title} className={cssClasses.fineControlIcons}>
          <Grid container direction="row" alignItems="center" justifyContent="center">
            <IconButton
              onClick={onLess}
              className={cssClasses.fineControlIcons}
              aria-label={labelLess}
              title={labelLess}
            >
              <RemoveIcon className={cssClasses.fineControlIcons} />
            </IconButton>
            <Typography className={cssClasses.fineControlIcons}>
              {isPercent ? (value * 100).toFixed(2) + "%" : value.toFixed(2)}
            </Typography>
            <IconButton
              onClick={onMore}
              className={cssClasses.fineControlIcons}
              aria-label={labelMore}
              title={labelMore}
            >
              <AddIcon className={cssClasses.fineControlIcons} />
            </IconButton>
          </Grid>
        </div>
      </FormControl>
    );
  else {
    return <div></div>;
  }
}

export default FineControl;
