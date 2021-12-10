import React, { ReactElement } from "react";
import Popover from "@material-ui/core/Popover";
import Typography from "@material-ui/core/Typography";
import { makeStyles, createStyles, Theme } from "@material-ui/core/styles";
import { DefinitionType } from "../lib/types";
import DefinitionTranslations from "../components/DefinitionTranslations";

// FIXME: for some reason trying to put a maxWidth on the popover has a
// weird effect, making it max out on desktop with about 250px, no matter
// what is put... whereas on mobile it seems to work...
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    popover: {
      pointerEvents: "none",
    },
    paper: {
      padding: theme.spacing(1),
    },
  }),
);
interface MeaningProps {
  definition: DefinitionType;
  showSynonyms: boolean;
}

export default function Meaning({ definition, showSynonyms }: MeaningProps): ReactElement {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const posTrans = [];
  for (const provider of definition.providerTranslations) {
    if (provider.posTranslations.length > 0) {
      for (const posTranslation of provider.posTranslations) {
        posTrans.push(
          <Typography key={"mean" + posTranslation.posTag}>
            {posTranslation.posTag}: {posTranslation.values.join(", ")}
          </Typography>,
        );
      }
      break;
    }
  }
  const synonyms = [];
  if (showSynonyms) {
    for (const posSynonym of definition.synonyms) {
      if (posSynonym.values.length > 0) {
        synonyms.push(
          <Typography key={"syn" + posSynonym.posTag}>
            {posSynonym.posTag}: {posSynonym.values.join(", ")}
          </Typography>,
        );
      }
    }
  }
  return (
    <div>
      <div
        aria-owns={open ? "mouse-over-popover" : undefined}
        aria-haspopup="true"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        {posTrans.concat(synonyms)}
      </div>
      <Popover
        id="mouse-over-popover"
        className={classes.popover}
        classes={{
          paper: classes.paper,
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <DefinitionTranslations definition={definition} />
      </Popover>
    </div>
  );
}
