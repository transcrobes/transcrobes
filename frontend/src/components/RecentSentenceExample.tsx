import { Button } from "@material-ui/core";
import React from "react";
import { ReactElement } from "react";

interface Props {
  modelId: BigInt | number;
  cssClasses?: string;
  isListItem?: boolean;
  onDelete?: (modelId: number | BigInt) => void;
}

export default function RecentSentenceExample({
  modelId,
  cssClasses,
  onDelete,
  isListItem = true,
}: Props): ReactElement {
  const del = onDelete ? () => onDelete(modelId) : undefined;
  const etf = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: del ? ".4em" : ".1em",
      }}
    >
      <enriched-text-fragment id={modelId}>loading...</enriched-text-fragment>
      {del && (
        <Button variant="outlined" onClick={del}>
          Delete
        </Button>
      )}
    </div>
  );
  return React.createElement(isListItem ? "li" : "span", { className: cssClasses }, etf);
}
