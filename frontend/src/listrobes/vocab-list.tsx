import { VocabItem } from "./vocab-item";
import SearchLoading from "../components/SearchLoading";
import { GraderConfig, VocabReview } from "../lib/types";

interface Props {
  vocab: VocabReview[];
  loading: boolean;
  graderConfig: GraderConfig;
  onGradeChange: (index: number) => void;
  onMouseOver: (index: number) => void;
  onMouseOut: () => void;
  onValidate: () => void;
  // onConfigChange: (graderConfig: GraderConfig) => void;
}

export function VocabList({
  vocab,
  loading,
  graderConfig,
  onGradeChange,
  onMouseOut,
  onMouseOver,
  onValidate,
}: Props) {
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
          <button
            className="btn btn-primary btn-user btn-block"
            onClick={onValidate}
            style={{ width: "80%" }}
            type="button"
          >
            Validate
          </button>
        </div>
      )}
    </>
  );
}
