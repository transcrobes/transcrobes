import { Box, useTheme } from "@mui/system";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { GradesType, VocabReview } from "../lib/types";
import { getColour } from "./funclib";

const useStyles = makeStyles<void, "descriptionText">()((theme, _params, classes) => ({
  tipText: {
    border: "1px #333 solid",
    padding: "3px",
    width: "80%",
    fontSize: "150%",
    pageBreakInside: "avoid",
    [`&:hover .${classes.descriptionText}`]: {
      display: "block",
    },
  },
  descriptionText: {
    transform: "translateY(35px)",
    display: "none",
    position: "absolute",
    border: "1px solid #000",
    padding: "5px",
    backgroundColor: theme.palette.background.default,
    zIndex: 2,
  },
}));

function RowItem({ item, gradeOrder }: { item: VocabReview; gradeOrder: GradesType[] }) {
  const palette = useTheme().palette;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        backgroundColor: getColour(gradeOrder[item.clicks], palette),
      }}
    >
      <div>{item.graph}</div>
      <div>{gradeOrder[item.clicks].icon}</div>
    </Box>
  );
}

function MeaningTooltip({ item }: { item: VocabReview }) {
  const { classes } = useStyles();
  const translate = useTranslate();
  return (
    <div className={classes.descriptionText}>
      <div>
        {translate("screens.listrobes.vocab_item_sound")} {item.sound.join(" ")}
      </div>
      <div>
        {translate("screens.listrobes.vocab_item_meaning")} {item.meaning}
      </div>
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

export function VocabItem({ index, item, gradeOrder, onMouseOut, onMouseOver, onGradeUpdate }: Props): ReactElement {
  function handleMouseOver(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    onMouseOver(index);
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    onGradeUpdate(index);
  }
  const { classes } = useStyles();
  return (
    <div className={classes.tipText}>
      <Box onClick={handleClick} onMouseEnter={handleMouseOver} onMouseLeave={onMouseOut}>
        <MeaningTooltip item={item} />
        <RowItem item={item} gradeOrder={gradeOrder} />
      </Box>
    </div>
  );
}
