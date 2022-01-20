import { Button, makeStyles, Theme } from "@material-ui/core";
import React, { ReactElement } from "react";
import { DEFAULT_RECENTS_READER_CONFIG_STATE } from "../features/content/simpleReaderSlice";
import { ReaderState, SentenceType } from "../lib/types";
import ReactSentence from "./content/td/ReactSentence";

interface Props {
  recentSentenceId: BigInt | number;
  sentence: SentenceType;
  readerConfig: ReaderState;
  isListItem?: boolean;
  onDelete?: (modelId: number | BigInt) => void;
}

export interface StyleProps {
  hasDelete: boolean;
}

const useStyles = makeStyles<Theme, StyleProps>({
  sentences: (props) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: props.hasDelete ? ".4em" : ".1em",
  }),
});

export default function RecentSentenceExample({
  recentSentenceId,
  sentence,
  readerConfig,
  onDelete,
  isListItem = true,
}: Props): ReactElement {
  const del = onDelete ? () => onDelete(recentSentenceId) : undefined;
  const localClasses = useStyles({ hasDelete: !!del });
  const etf = (
    <div className={localClasses.sentences}>
      <ReactSentence sentence={sentence} readerConfig={readerConfig} />
      {del && (
        <Button variant="outlined" onClick={del}>
          Delete
        </Button>
      )}
    </div>
  );
  return React.createElement(isListItem ? "li" : "span", null, etf);
}
