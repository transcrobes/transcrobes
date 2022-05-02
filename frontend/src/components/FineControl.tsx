import { FormControl, FormLabel } from "@mui/material";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { ReactElement } from "react";

export interface FineControlImplProps {
  className: string;
  label?: string;
  increment?: number;
  value: number;
  onValueChange: (value: number) => void;
}

interface Props {
  title?: string;
  value: number;
  isPercent: boolean;
  labelLess: string;
  labelMore: string;
  className: string;
  onMore: () => void;
  onLess: () => void;
}

function FineControl({
  title,
  value,
  isPercent,
  labelLess,
  labelMore,
  className,
  onLess,
  onMore,
}: Props): ReactElement {
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">{title}</FormLabel>
      <div title={title} className={className}>
        <Grid container direction="row" alignItems="center" justifyContent="center">
          <IconButton
            onClick={onLess}
            className={className}
            aria-label={labelLess}
            title={labelLess}
            size="large">
            <RemoveIcon className={className} />
          </IconButton>
          <Typography className={className}>{isPercent ? (value * 100).toFixed(2) + "%" : value.toFixed(2)}</Typography>
          <IconButton
            onClick={onMore}
            className={className}
            aria-label={labelMore}
            title={labelMore}
            size="large">
            <AddIcon className={className} />
          </IconButton>
        </Grid>
      </div>
    </FormControl>
  );
}

export default FineControl;
