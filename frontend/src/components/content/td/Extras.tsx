import { ClassNameMap } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { getTranslation } from "../../../lib/componentMethods";
import { DefinitionType, SentenceType, TokenType } from "../../../lib/types";
import { Loading } from "../../Loading";
import RecentSentences from "./RecentSentences";

type SentenceTranslationProps = {
  sentence: SentenceType;
};

function SentenceTranslation({ sentence }: SentenceTranslationProps): ReactElement {
  const [translation, setTranslation] = useState("");
  const translate = useTranslate();
  useEffect(() => {
    (async () => {
      setTranslation(await getTranslation(sentence));
    })();
  }, []);

  return (
    <div>
      {translation || (
        <Loading
          messageSx={{ fontSize: "0.4em" }}
          position="relative"
          size={50}
          top="0px"
          message={translate("widgets.popup.translating")}
          show
        />
      )}
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
