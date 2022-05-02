import CheckIcon from "@mui/icons-material/Check";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import { IconButton, useTheme } from "@mui/material";
import * as CSS from "csstype";
import { ReactElement } from "react";
import { makeStyles } from "tss-react/mui";
import { GRADE } from "../database/Schema";

interface IconProps {
  iconPadding?: string;
}

const useStyles = makeStyles<IconProps>()((_theme, params) => ({
  practicerStyle: {
    display: "flex" as const,
    justifyContent: "space-between",
    padding: "0.5em",
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
}: PracticerInputProps): ReactElement {
  function addOrUpdateCards(grade: number) {
    onPractice(wordId, grade);
  }
  const theme = useTheme();
  const { classes } = useStyles({ iconPadding });
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
        title="I don't know this word yet"
        onClick={() => addOrUpdateCards(GRADE.UNKNOWN)}
        size="large"
      >
        <SentimentVeryDissatisfiedIcon sx={iconSizeStyle} />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title="I am not confident with this word"
        onClick={() => addOrUpdateCards(GRADE.HARD)}
        size="large"
      >
        <SentimentSatisfiedIcon sx={iconSizeStyle} />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title="I am comfortable with this word"
        onClick={() => addOrUpdateCards(GRADE.GOOD)}
        size="large"
      >
        <SentimentVerySatisfiedIcon sx={iconSizeStyle} />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title="I know this word, I don't need to revise it again"
        onClick={() => addOrUpdateCards(GRADE.KNOWN)}
        size="large"
      >
        <CheckIcon sx={iconSizeStyle} />
      </IconButton>
    </div>
  );
}

export default PracticerInput;
