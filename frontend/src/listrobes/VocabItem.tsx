import { makeStyles } from "@material-ui/core";
import { ReactElement } from "react";
import { GradesType, VocabReview } from "../lib/types";

const useStyles = makeStyles(() => ({
  tipText: {
    border: "1px #333 solid",
    padding: "3px",
    width: "80%",
    fontSize: "150%",
    pageBreakInside: "avoid",
  },
  descriptionText: {
    transform: "translateY(35px)",
    display: "none",
    position: "absolute",
    border: "1px solid #000",
    padding: "5px",
    backgroundColor: "white",
    opacity: "1",
    "$tipText:hover &": {
      display: "block",
    },
  },
  rowItem: { display: "flex", justifyContent: "space-between" },
}));

function RowItem({ item, gradeOrder }: { item: VocabReview; gradeOrder: GradesType[] }) {
  const classes = useStyles();
  return (
    <div className={classes.rowItem}>
      <div>{item.graph}</div>
      <div>{gradeOrder[item.clicks].icon}</div>
    </div>
  );
}

function MeaningTooltip({ item }: { item: VocabReview }) {
  const classes = useStyles();
  return (
    <div className={classes.descriptionText}>
      <div>Pinyin: {item.sound.join(" ")}</div>
      <div>Meaning: {item.meaning}</div>
    </div>
  );
}

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
}: Props): ReactElement {
  function handleMouseOver(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    onMouseOver(index);
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    onGradeUpdate(index);
  }
  const classes = useStyles();
  return (
    <div className={classes.tipText}>
      <div onClick={handleClick} onMouseEnter={handleMouseOver} onMouseLeave={onMouseOut}>
        <MeaningTooltip item={item} />
        <RowItem item={item} gradeOrder={gradeOrder} />
      </div>
    </div>
  );
}
