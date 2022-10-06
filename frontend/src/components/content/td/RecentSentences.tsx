import { ClassNameMap } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { getRecentSentences } from "../../../lib/componentMethods";
import {
  DEFAULT_RECENTS_READER_CONFIG_STATE,
  DefinitionType,
  RecentSentencesType,
  TokenType,
} from "../../../lib/types";
import ReactSentence from "./ReactSentence";

type Props = {
  token: TokenType;
  classes: ClassNameMap<string>;
  definition: DefinitionType;
};

export default function RecentSentences({ token, classes, definition }: Props): ReactElement {
  const [recentSentences, setRecentSentences] = useState<RecentSentencesType | null>(null);
  useEffect(() => {
    (async () => {
      setRecentSentences(await getRecentSentences(token, definition));
    })();
  }, []);

  return recentSentences ? (
    <div className={classes.recentSentences}>
      <hr />
      <div>
        <div>Similar examples</div>
        {Object.values(recentSentences.posSentences).map((recentSentence, i) => {
          return (
            <div key={i}>
              {" "}
              -{" "}
              <span>
                {recentSentence?.map((sentence, j) => {
                  return (
                    <ReactSentence
                      key={j}
                      sentence={sentence.sentence}
                      readerConfig={DEFAULT_RECENTS_READER_CONFIG_STATE}
                    />
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <></>
  );
}
