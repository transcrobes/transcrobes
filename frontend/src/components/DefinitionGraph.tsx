import { Button } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { ReactElement, useState } from "react";
import { CharacterType } from "../lib/types";
import CharacterGraph from "./CharacterGraph";
import DiscoverableWord from "./DiscoverableWord";

const useStyles = makeStyles()({
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
  newTab?: boolean;
  title?: string;
}

export default function DefinitionGraph({
  characters,
  showAnswer,
  charHeight,
  charWidth,
  newTab,
  title,
}: Props): ReactElement {
  const [toAnimate, setToAnimate] = useState(characters.map(() => 0));
  const { classes } = useStyles();
  function draw() {
    const toAnimateUpdate = characters.map(() => 0);
    toAnimateUpdate[0] = 1;
    setToAnimate(toAnimateUpdate);
  }

  function onChildAnimateFinished(index: number, character: CharacterType) {
    const toAnimateUpdate = [...toAnimate];
    toAnimateUpdate[index] = 0;
    toAnimateUpdate[index + 1] = 1;
    setToAnimate(toAnimateUpdate);
  }
  return (
    <div title={title}>
      <div className={classes.centred}>
        {characters
          .filter((x) => !!x)
          .map((character, index) => {
            return (
              <DiscoverableWord
                key={`${character ? character.id : "nochar"}-${index}`}
                graph={showAnswer ? character?.id : ""}
                newTab={newTab}
              >
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
              </DiscoverableWord>
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
