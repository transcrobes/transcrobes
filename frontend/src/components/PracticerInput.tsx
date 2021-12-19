import { GRADE } from "../database/Schema";
import { ReactElement } from "react";
import { IconButton, makeStyles, Theme } from "@material-ui/core";
import SentimentVerySatisfiedIcon from "@material-ui/icons/SentimentVerySatisfied";
import SentimentVeryDissatisfiedIcon from "@material-ui/icons/SentimentVeryDissatisfied";
import SentimentSatisfiedIcon from "@material-ui/icons/SentimentSatisfied";
import CheckIcon from "@material-ui/icons/Check";
import { Property } from "csstype";

interface IconProps {
  iconColour?: Property.Color;
}

const useStyles = makeStyles<Theme, IconProps>((theme) => ({
  practicerStyle: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.5em",
  },

  iconStyle: {
    "& svg": {
      [theme.breakpoints.down("sm")]: {
        fontSize: 75,
      },
      [theme.breakpoints.up("sm")]: {
        fontSize: 100,
      },
      color: ({ iconColour }: IconProps) => iconColour || "blue",
    },
  },
}));

interface PracticerInputProps {
  iconColour?: Property.Color;
  onPractice: (wordId: string, grade: number) => void;
  wordId: string;
}

function PracticerInput({ wordId, onPractice, iconColour }: PracticerInputProps): ReactElement {
  function addOrUpdateCards(grade: number) {
    onPractice(wordId, grade);
  }
  const classes = useStyles({ iconColour: iconColour });
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
