import { FaFrown, FaMeh, FaSmile, FaCheck } from "react-icons/fa";
import { GRADE } from "../database/Schema";
import styled from "styled-components";
import { ReactElement } from "react";

const PracticerStyle = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5em;
`;

const SVGButton = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  &:focus {
    outline: 2px dashed #17171d;
  }
  &:hover {
    svg {
      transform: scale(1.1);
    }
  }
  &::-moz-focus-inner {
    border: 0;
  }
  svg {
    outline: none;
    transition: transform 0.15s linear;
  }
`;

interface PracticerInputProps {
  onPractice: (wordId: string, grade: number) => void;
  wordId: string;
}

function PracticerInput({ wordId, onPractice }: PracticerInputProps): ReactElement {
  function addOrUpdateCards(grade: number) {
    onPractice(wordId, grade);
  }
  return (
    <PracticerStyle>
      <SVGButton title="I don't know this word yet">
        <FaFrown onClick={() => addOrUpdateCards(GRADE.UNKNOWN)} />
      </SVGButton>
      <SVGButton title="I am not confident with this word">
        <FaMeh onClick={() => addOrUpdateCards(GRADE.HARD)} />
      </SVGButton>
      <SVGButton title="I am comfortable with this word">
        <FaSmile onClick={() => addOrUpdateCards(GRADE.GOOD)} />
      </SVGButton>
      <SVGButton title="I know this word, I don't need to revise it again">
        <FaCheck onClick={() => addOrUpdateCards(GRADE.KNOWN)} />
      </SVGButton>
    </PracticerStyle>
  );
}

export default PracticerInput;
