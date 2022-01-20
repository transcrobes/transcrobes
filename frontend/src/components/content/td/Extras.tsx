import { ClassNameMap } from "@material-ui/styles";
import { ReactElement, useEffect, useState } from "react";
import { getTranslation } from "../../../lib/componentMethods";
import { DefinitionType, SentenceType, TokenType } from "../../../lib/types";
import RecentSentences from "./RecentSentences";

type SentenceTranslationProps = {
  sentence: SentenceType;
};
function SentenceTranslation({ sentence }: SentenceTranslationProps): ReactElement {
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    (async () => {
      setTranslation(await getTranslation(sentence));
    })();
  }, []);

  return <div>{translation}</div>;
}

type Props = {
  token: TokenType;
  classes: ClassNameMap<string>;
  sentence: SentenceType;
  definition: DefinitionType;
};
export default function Extras({ token, classes, sentence, definition }: Props): ReactElement {
  return (
    <div>
      <SentenceTranslation sentence={sentence} />
      <RecentSentences token={token} classes={classes} definition={definition} />
    </div>
  );
}
