import styled from "styled-components";
import { GradesType, VocabReview } from "../lib/types";

function RowItem({ item, gradeOrder }: { item: VocabReview; gradeOrder: GradesType[] }) {
  // FIXME: migrate the style to a styled-component
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div>{item.graph}</div>
      <div>{gradeOrder[item.clicks].icon}</div>
    </div>
  );
}

function MeaningTooltip({ item }: { item: VocabReview }) {
  return (
    <DescriptionText>
      <div>
        <div>Pinyin: {item.sound.join(" ")}</div>
        <div>Meaning: {item.meaning}</div>
      </div>
    </DescriptionText>
  );
}

const TipText = styled.div`
  border: 1px #333 solid;
  padding: 3px;
  width: 80%;
  font-size: 150%;
  page-break-inside: avoid;
`;

const DescriptionText = styled.div`
  transform: translateY(35px);
  display: none;
  position: absolute;
  border: 1px solid #000;
  padding: 5px;
  background-color: white;
  opacity: 1;
  ${TipText}:hover & {
    display: block;
  }
`;

interface Props {
  index: number;
  item: any;
  gradeOrder: GradesType[];
  onGradeUpdate: (index: number) => void;
  onMouseOver: (index: number) => void;
  onMouseOut: () => void;
}

export function VocabItem({
  index,
  item,
  gradeOrder,
  onMouseOut,
  onMouseOver,
  onGradeUpdate,
}: Props) {
  function handleMouseOver(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    onMouseOver(index);
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    onGradeUpdate(index);
  }
  return (
    <TipText>
      <div onClick={handleClick} onMouseEnter={handleMouseOver} onMouseLeave={onMouseOut}>
        <MeaningTooltip item={item} />
        <RowItem item={item} gradeOrder={gradeOrder} />
      </div>
    </TipText>
  );
}
