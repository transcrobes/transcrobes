import { Button } from "@mui/material";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { GraderConfig, VocabReview } from "../lib/types";
import { VocabItem } from "./VocabItem";

interface Props {
  vocab: VocabReview[];
  graderConfig: GraderConfig;
  onGradeChange: (index: number) => void;
  onMouseOver: (index: number) => void;
  onMouseOut: () => void;
  onValidate: () => Promise<void>;
}

export function VocabList({
  vocab,
  graderConfig,
  onGradeChange,
  onMouseOut,
  onMouseOver,
  onValidate,
}: Props): ReactElement {
  const loading = useAppSelector((state) => state.ui.loading);
  const translate = useTranslate();
  const unloaded = loading || !vocab;
  return (
    <>
      {!unloaded && vocab.length === 0 && <span>{translate("screens.listrobes.finished")}</span>}
      {!unloaded &&
        vocab.map((vocabItem, index) => {
          return (
            <VocabItem
              key={vocabItem.graph + vocab.length}
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
            {translate("ra.action.save")}
          </Button>
        </div>
      )}
    </>
  );
}
