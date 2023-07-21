import CheckIcon from "@mui/icons-material/Check";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import { IconButton, useTheme } from "@mui/material";
import * as CSS from "csstype";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { GRADE } from "../workers/rxdb/Schema";

interface IconProps {
  iconPadding?: string;
  width?: string;
}

const useStyles = makeStyles<IconProps>()((_theme, params) => ({
  practicerStyle: {
    display: "flex" as const,
    justifyContent: "space-between",
    padding: "0.5em",
    width: params.width || "100%",
  },
  iconStyle: {
    padding: params.iconPadding || "12px",
  },
}));

interface PracticerInputProps {
  iconColour?: CSS.Property.Color;
  smallSize?: number;
  largeSize?: number;
  iconPadding?: string;
  width?: string;
  onPractice: (wordId: string, grade: number) => void;
  wordId: string;
}

function PracticerInput({
  wordId,
  onPractice,
  iconColour,
  smallSize,
  largeSize,
  iconPadding,
  width,
}: PracticerInputProps): ReactElement {
  function addOrUpdateCards(grade: number) {
    onPractice(wordId, grade);
  }
  const theme = useTheme();
  const translate = useTranslate();
  const { classes } = useStyles({ iconPadding, width });
  const iconSizeStyle = {
    [theme.breakpoints.down("md")]: {
      fontSize: smallSize || 72,
    },
    [theme.breakpoints.up("sm")]: {
      fontSize: largeSize || 100,
    },
    color: iconColour || "blue",
  };

  return (
    <div className={classes.practicerStyle}>
      <IconButton
        className={classes.iconStyle}
        title={translate("widgets.practicerInput.unknown_desc")}
        onClick={() => addOrUpdateCards(GRADE.UNKNOWN)}
        size="large"
      >
        <SentimentVeryDissatisfiedIcon sx={iconSizeStyle} />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title={translate("widgets.practicerInput.hard_desc")}
        onClick={() => addOrUpdateCards(GRADE.HARD)}
        size="large"
      >
        <SentimentSatisfiedIcon sx={iconSizeStyle} />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title={translate("widgets.practicerInput.good_desc")}
        onClick={() => addOrUpdateCards(GRADE.GOOD)}
        size="large"
      >
        <SentimentVerySatisfiedIcon sx={iconSizeStyle} />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title={translate("widgets.practicerInput.known_desc")}
        onClick={() => addOrUpdateCards(GRADE.KNOWN)}
        size="large"
      >
        <CheckIcon sx={iconSizeStyle} />
      </IconButton>
    </div>
  );
}

export default PracticerInput;
