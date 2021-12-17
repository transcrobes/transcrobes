import { Button, makeStyles } from "@material-ui/core";
import { ReactElement, useState } from "react";
import { CharacterType } from "../lib/types";
import CharacterGraph from "./CharacterGraph";

const useStyles = makeStyles({
  centred: {
    display: "flex",
    justifyContent: "center",
  },
});

interface Props {
  characters: (CharacterType | null)[];
  showAnswer: boolean;
  charWidth?: number;
  charHeight?: number;
}

export default function DefinitionGraph({
  characters,
  showAnswer,
  charHeight,
  charWidth,
}: Props): ReactElement {
  const [toAnimate, setToAnimate] = useState(characters.map(() => 0));
  const classes = useStyles();
  function draw() {
    console.debug("Starting the animation from the start");
    const toAnimateUpdate = characters.map(() => 0);
    toAnimateUpdate[0] = 1;
    setToAnimate(toAnimateUpdate);
  }

  function onChildAnimateFinished(index: number, character: CharacterType) {
    console.debug(`Index ${index} animated, now doing the following with character`, character);
    const toAnimateUpdate = [...toAnimate];
    toAnimateUpdate[index] = 0;
    toAnimateUpdate[index + 1] = 1;
    setToAnimate(toAnimateUpdate);
  }

  console.debug("Rendering DefinitionGraph with chars", characters);
  return (
    <div>
      <div className={classes.centred}>
        {characters
          .filter((x) => !!x)
          .map((character, index) => {
            return (
              <CharacterGraph
                width={charWidth}
                height={charHeight}
                animate={toAnimate[index]}
                index={index}
                key={`${character ? character.id : "nochar"}-${index}`}
                character={character}
                onAnimateFinished={onChildAnimateFinished}
                showAnswer={showAnswer}
              />
            );
          })}
      </div>
      {showAnswer && (
        <div className={classes.centred}>
          <Button onClick={() => draw()} variant="contained" color="primary">
            Draw it!
          </Button>
        </div>
      )}
    </div>
  );
}
