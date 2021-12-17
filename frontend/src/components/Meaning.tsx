import { ReactElement, useState } from "react";
import Popover from "@material-ui/core/Popover";
import { makeStyles, createStyles, Theme } from "@material-ui/core/styles";
import { CardType, DefinitionType, SIMPLE_POS_TYPES } from "../lib/types";
import DefinitionTranslations from "./DefinitionTranslations";
import EditableDefinitionTranslations from "./EditableDefinitionTranslations";
import MeaningText from "../repetrobes/MeaningText";
import SynonymsText from "../repetrobes/SynonymsText";
import { filterFakeL1Definitions, toSimplePosLabels } from "../lib/lib";
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    popover: {
      pointerEvents: "none",
    },
    paper: {
      padding: theme.spacing(1),
    },
    typography: {
      padding: theme.spacing(2),
    },
  }),
);
interface MeaningProps {
  definition: DefinitionType;
  showSynonyms: boolean;
  card: CardType;
  onCardFrontUpdate: (card: CardType) => void;
}

export default function Meaning({
  definition,
  showSynonyms,
  card,
  onCardFrontUpdate,
}: MeaningProps): ReactElement {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorElClick, setAnchorElClick] = useState<HTMLElement | null>(null);

  function handleClickOpen(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    handlePopoverClose();
    setAnchorElClick(event.currentTarget);
  }
  function handleClickClose() {
    setAnchorElClick(null);
  }
  function handlePopoverOpen(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setAnchorEl(event.currentTarget);
  }
  function handlePopoverClose() {
    setAnchorEl(null);
  }

  const open = Boolean(anchorEl);
  const clickOpen = Boolean(anchorElClick);
  const id = clickOpen ? "simple-popover" : undefined;
  const posTrans: ReactElement[] = [];
  let defaultProvider = "";
  if (!card.front) {
    for (const provider of definition.providerTranslations) {
      if (provider.posTranslations.length > 0) {
        let hasValidDefinitions = false;
        for (const posTranslation of provider.posTranslations) {
          const finalList = filterFakeL1Definitions(
            posTranslation.values.filter((v) => !v.match(definition.graph)),
            definition.sound,
          );
          if (finalList.length > 0) {
            hasValidDefinitions = true;
            posTrans.push(
              <div key={"mean" + posTranslation.posTag}>
                {toSimplePosLabels(posTranslation.posTag as SIMPLE_POS_TYPES)}:{" "}
                {finalList.join(", ")}
              </div>,
            );
          }
        }
        if (hasValidDefinitions) {
          defaultProvider = provider.provider;
          break;
        }
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
        onClick={handleClickOpen}
      >
        <MeaningText defaultElements={posTrans} card={card} />
        {showSynonyms && <SynonymsText synonyms={definition.synonyms} />}
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
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <DefinitionTranslations definition={definition} />
      </Popover>
      <Popover
        id={id}
        open={clickOpen}
        anchorEl={anchorElClick}
        onClose={handleClickClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <EditableDefinitionTranslations
          definition={definition}
          card={card}
          defaultProvider={defaultProvider}
          onUpdate={(card: CardType) => {
            onCardFrontUpdate(card);
          }}
        />
      </Popover>
    </div>
  );
}
