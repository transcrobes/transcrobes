import { Button } from "@material-ui/core";
import { ReactElement, useState } from "react";
import styled from "styled-components";
import { CharacterType } from "../lib/types";
import CharacterGraph from "./CharacterGraph";

interface Props {
  characters: (CharacterType | null)[];
  showAnswer: boolean;
  charWidth?: number;
  charHeight?: number;
}

const CentredFlex = styled.div`
  display: flex;
  justify-content: center;
`;

export default function DefinitionGraph({
  characters,
  showAnswer,
  charHeight,
  charWidth,
}: Props): ReactElement {
  const [toAnimate, setToAnimate] = useState(characters.map(() => 0));

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
      <CentredFlex>
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
      </CentredFlex>
      {showAnswer && (
        <CentredFlex>
          <Button onClick={() => draw()} variant="contained" color="primary">
            Draw it!
          </Button>
        </CentredFlex>
      )}
    </div>
  );
}
