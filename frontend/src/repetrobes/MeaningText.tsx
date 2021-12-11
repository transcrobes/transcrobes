import { ReactElement } from "react";
import { CardType, noop } from "../lib/types";
import { convertFromRaw, EditorState, Editor } from "draft-js";
import "draft-js/dist/Draft.css";

interface Props {
  card: CardType;
  defaultElements: ReactElement[];
}

export default function MeaningText({ card, defaultElements }: Props): ReactElement {
  return card.front ? (
    <Editor
      key={1}
      editorState={EditorState.createWithContent(convertFromRaw(JSON.parse(card.front)))}
      onChange={noop}
      readOnly={true}
    />
  ) : (
    <>{defaultElements}</>
  );
}
