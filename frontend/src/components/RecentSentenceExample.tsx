import { Box, Button } from "@mui/material";
import React, { ReactElement } from "react";
import { ReaderState, SentenceType } from "../lib/types";
import ReactSentence from "./content/td/ReactSentence";

interface Props {
  recentSentenceId: bigint | number;
  sentence: SentenceType;
  readerConfig: ReaderState;
  isListItem?: boolean;
  onDelete?: (modelId: number | bigint) => void;
  sameTab?: boolean;
}

export interface StyleProps {
  hasDelete: boolean;
}

export default function RecentSentenceExample({
  recentSentenceId,
  sentence,
  readerConfig,
  onDelete,
  sameTab,
  isListItem = true,
}: Props): ReactElement {
  const del = !!onDelete ? () => onDelete(recentSentenceId) : undefined;
  const etf = !!del ? (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: !!del ? ".4em" : ".1em",
      }}
    >
      <ReactSentence sentence={sentence} readerConfig={readerConfig} sameTab={sameTab} />
      <Button variant="outlined" onClick={del}>
        Delete
      </Button>
    </Box>
  ) : (
    <ReactSentence sentence={sentence} readerConfig={readerConfig} sameTab={sameTab} />
  );
  return React.createElement(isListItem ? "li" : "span", null, etf);
}
