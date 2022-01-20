import { IconButton, makeStyles, Theme } from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";
import SentimentSatisfiedIcon from "@material-ui/icons/SentimentSatisfied";
import SentimentVeryDissatisfiedIcon from "@material-ui/icons/SentimentVeryDissatisfied";
import SentimentVerySatisfiedIcon from "@material-ui/icons/SentimentVerySatisfied";
import * as CSS from "csstype";
import { ReactElement } from "react";
import { GRADE } from "../database/Schema";

interface IconProps {
  iconColour?: CSS.Color;
  iconPadding?: string;
  smallSize?: number;
  largeSize?: number;
}

const useStyles = makeStyles<Theme, IconProps>((theme) => ({
  practicerStyle: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.5em",
  },
  iconStyle: ({ iconColour, iconPadding, smallSize, largeSize }: IconProps) => {
    return {
      "& svg": {
        [theme.breakpoints.down("sm")]: {
          fontSize: smallSize || 72,
        },
        [theme.breakpoints.up("sm")]: {
          fontSize: largeSize || 100,
        },
        color: iconColour || "blue",
      },
      padding: iconPadding || "12px",
    };
  },
}));

interface PracticerInputProps {
  iconColour?: CSS.Color;
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
  const classes = useStyles({ iconColour, smallSize, largeSize, iconPadding });
  return (
    <div className={classes.practicerStyle}>
      <IconButton
        className={classes.iconStyle}
        title="I don't know this word yet"
        onClick={() => addOrUpdateCards(GRADE.UNKNOWN)}
      >
        <SentimentVeryDissatisfiedIcon />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title="I am not confident with this word"
        onClick={() => addOrUpdateCards(GRADE.HARD)}
      >
        <SentimentSatisfiedIcon />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title="I am comfortable with this word"
        onClick={() => addOrUpdateCards(GRADE.GOOD)}
      >
        <SentimentVerySatisfiedIcon />
      </IconButton>
      <IconButton
        className={classes.iconStyle}
        title="I know this word, I don't need to revise it again"
        onClick={() => addOrUpdateCards(GRADE.KNOWN)}
      >
        <CheckIcon />
      </IconButton>
    </div>
  );
}

export default PracticerInput;
