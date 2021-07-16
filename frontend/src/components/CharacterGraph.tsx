import HanziWriter from "hanzi-writer";
import { ReactElement, useEffect, useRef, useState } from "react";
import { CharacterType } from "../lib/types";

const WIDTH = 150;
const HEIGHT = 150;

function s(num: number, half = false) {
  return (num / (half ? 2 : 1)).toString();
}

interface CharacterGraphProps {
  character: CharacterType | null;
  showAnswer: boolean;
  width?: number;
  height?: number;
  index: number;
  animate: number;
  onAnimateFinished: (index: number, character: CharacterType) => void;
}

export default function CharacterGraph({
  width,
  height,
  animate,
  character,
  index,
  showAnswer,
  onAnimateFinished,
}: CharacterGraphProps): ReactElement {
  const [hanzi, setHanzi] = useState<HanziWriter>();

  const prevAnimateRef = useRef<number>();

  useEffect(() => {
    prevAnimateRef.current = animate;
  });

  const prevAnimate = prevAnimateRef.current;

  useEffect(() => {
    if (!!character && !!hanzi && !!showAnswer) {
      hanzi.cancelQuiz();
      hanzi.showCharacter();
      hanzi.showOutline();
    }
    if (!!character && !!hanzi && !!animate && animate !== prevAnimate) {
      console.debug("Animating character", character);
      hanzi.animateCharacter({
        onComplete: () => {
          onAnimateFinished(index, character);
        },
      });
    }
  });

  useEffect(() => {
    if (character) {
      const { id, structure } = character;
      const options = {
        width: width || WIDTH,
        height: height || HEIGHT,
        padding: 3,
        // quiz options
        showCharacter: showAnswer,
        showOutline: showAnswer,
        // animate options
        strokeAnimationSpeed: 2, // 2x normal speed
        delayBetweenStrokes: 300, // milliseconds
        radicalColor: "#337ab7", // blue
        charDataLoader: () => structure,
      };

      const hz = HanziWriter.create(`${id}-${index}`, id, options);
      if (!showAnswer) {
        hz.quiz({
          leniency: 2.0, // default 1.0, min 0, max???
        });
      }
      setHanzi(hz);
    }
  }, []);

  const svgId = `${character ? character.id : "nochar"}-${index}`;
  const SWIDTH = s(width || WIDTH);
  const SHEIGHT = s(height || HEIGHT);
  const SHALF_WIDTH = s(width || WIDTH, true);
  const SHALF_HEIGHT = s(height || HEIGHT, true);

  return (
    <div style={{ padding: ".1em" }}>
      <svg xmlns="http://www.w3.org/2000/svg" width={SWIDTH} height={SHEIGHT} id={svgId}>
        <line x1="0" y1="0" x2={SWIDTH} y2={SHEIGHT} stroke="#DDD" />
        <line x1={SWIDTH} y1="0" x2="0" y2={SHEIGHT} stroke="#DDD" />
        <line x1={SHALF_WIDTH} y1="0" x2={SHALF_WIDTH} y2={SHEIGHT} stroke="#DDD" />
        <line x1="0" y1={SHALF_HEIGHT} x2={SWIDTH} y2={SHALF_HEIGHT} stroke="#DDD" />
      </svg>
    </div>
  );
}
