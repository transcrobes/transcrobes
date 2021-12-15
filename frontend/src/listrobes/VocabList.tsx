import { ReactElement } from "react";
import { VocabItem } from "./VocabItem";
import SearchLoading from "../components/SearchLoading";
import { GraderConfig, VocabReview } from "../lib/types";
import { Button } from "@material-ui/core";

interface Props {
  vocab: VocabReview[];
  loading: boolean;
  graderConfig: GraderConfig;
  onGradeChange: (index: number) => void;
  onMouseOver: (index: number) => void;
  onMouseOut: () => void;
  onValidate: () => void;
}

export function VocabList({
  vocab,
  loading,
  graderConfig,
  onGradeChange,
  onMouseOut,
  onMouseOver,
  onValidate,
}: Props): ReactElement {
  const unloaded = loading || !vocab;
  return (
    <>
      {unloaded && <SearchLoading />}
      {!unloaded && vocab.length === 0 && <span>No remaining vocabulary items</span>}
      {!unloaded &&
        vocab.map((vocabItem, index) => {
          return (
            <VocabItem
              key={vocabItem.graph}
              item={vocabItem}
              gradeOrder={graderConfig.gradeOrder}
              index={index}
              onGradeUpdate={onGradeChange}
              onMouseOver={onMouseOver}
              onMouseOut={onMouseOut}
            />
          );
        })}
      {!unloaded && vocab.length > 0 && (
        <div style={{ width: "100%", paddingTop: "1em" }}>
          <Button variant="outlined" onClick={onValidate} style={{ width: "80%" }}>
            Validate
          </Button>
        </div>
      )}
    </>
  );
}
