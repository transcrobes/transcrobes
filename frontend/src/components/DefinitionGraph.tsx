import { ReactElement, useState } from "react";
import { CharacterType } from "../lib/types";
import CharacterGraph from "./CharacterGraph";

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
    <div className="row" style={{ alignItems: "center", justifyContent: "center" }}>
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
      {showAnswer && (
        <div>
          <button
            style={{ marginLeft: "2em" }}
            type="button"
            onClick={() => draw()}
            className="btn btn-primary btn-user btn-block"
          >
            Draw it!
          </button>
        </div>
      )}
    </div>
  );
}
