import { makeStyles } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/styles";
import { ReactElement, useEffect, useState } from "react";
import { getTranslation } from "../../../lib/componentMethods";
import { DefinitionType, SentenceType, TokenType } from "../../../lib/types";
import { Loading } from "../../Loading";
import RecentSentences from "./RecentSentences";

type SentenceTranslationProps = {
  sentence: SentenceType;
};

const useStyles = makeStyles({
  message: {
    fontSize: "1em",
  },
  loading: {},
});

function SentenceTranslation({ sentence }: SentenceTranslationProps): ReactElement {
  const [translation, setTranslation] = useState("");

  const classes = useStyles();
  useEffect(() => {
    (async () => {
      setTranslation(await getTranslation(sentence));
    })();
  }, []);

  return (
    <div>
      {translation || <Loading classes={classes} position="relative" size={50} top="0px" message="Translating..." />}
    </div>
  );
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
