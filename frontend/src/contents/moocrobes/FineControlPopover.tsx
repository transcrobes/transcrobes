import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Properties } from "csstype";
import { ReactElement } from "react";
import { ClassNameMap } from "@mui/material";

export interface FineControlImplProps {
  classes: Properties;
  value: number;
  onValueChange: (value: number) => void;
}

interface Props {
  title: string;
  value: number;
  isPercent: boolean;
  labelLess: string;
  labelMore: string;
  cssClasses: ClassNameMap<"fineControlIcons">;
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
      <div title={title} className={cssClasses.fineControlIcons}>
        <Grid container direction="row" alignItems="center" justifyContent="center">
          <IconButton
            onClick={onLess}
            className={cssClasses.fineControlIcons}
            aria-label={labelLess}
            title={labelLess}
            size="large"
          >
            <RemoveIcon className={cssClasses.fineControlIcons} fontSize="small" />
          </IconButton>
          <Typography className={cssClasses.fineControlIcons}>
            {isPercent ? (value * 100).toFixed(2) + "%" : value.toFixed(2)}
          </Typography>
          <IconButton
            onClick={onMore}
            className={cssClasses.fineControlIcons}
            aria-label={labelMore}
            title={labelMore}
            size="large"
          >
            <AddIcon className={cssClasses.fineControlIcons} fontSize="small" />
          </IconButton>
        </Grid>
      </div>
    );
  else {
    return <div></div>;
  }
}

export default FineControl;
