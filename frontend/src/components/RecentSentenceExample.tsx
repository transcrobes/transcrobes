import { Button } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import React, { ReactElement } from "react";
import { ReaderState, SentenceType } from "../lib/types";
import ReactSentence from "./content/td/ReactSentence";

interface Props {
  recentSentenceId: BigInt | number;
  sentence: SentenceType;
  readerConfig: ReaderState;
  isListItem?: boolean;
  onDelete?: (modelId: number | BigInt) => void;
  sameTab?: boolean;
}

export interface StyleProps {
  hasDelete: boolean;
}

const useStyles = makeStyles<StyleProps>()((_theme, params) => {
  return {
    sentences: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      margin: params.hasDelete ? ".4em" : ".1em",
    },
  };
});

export default function RecentSentenceExample({
  recentSentenceId,
  sentence,
  readerConfig,
  onDelete,
  sameTab,
  isListItem = true,
}: Props): ReactElement {
  const del = onDelete ? () => onDelete(recentSentenceId) : undefined;
  const { classes: localClasses } = useStyles({ hasDelete: !!del });
  const etf = del ? (
    <div className={localClasses.sentences}>
      <ReactSentence sentence={sentence} readerConfig={readerConfig} sameTab={sameTab} />
      <Button variant="outlined" onClick={del}>
        Delete
      </Button>
    </div>
  ) : (
    <ReactSentence sentence={sentence} readerConfig={readerConfig} sameTab={sameTab} />
  );
  return React.createElement(isListItem ? "li" : "span", null, etf);
}
