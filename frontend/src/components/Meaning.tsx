import Popover from "@mui/material/Popover";
import { makeStyles } from "tss-react/mui";
import { ReactElement, useState } from "react";
import { useAppSelector } from "../app/hooks";
import {
  cleanedSound,
  filterFakeL1Definitions,
  filterUnhelpfulL1Definitions,
  orderTranslations,
  toPosLabels,
} from "../lib/libMethods";
import { CardType, DefinitionType } from "../lib/types";
import DefinitionTranslations from "./DefinitionTranslations";
import EditableDefinitionTranslations from "./EditableDefinitionTranslations";
import MeaningText from "./MeaningText";
import SynonymsText from "./SynonymsText";
import { useTranslate } from "react-admin";

const useStyles = makeStyles()((theme) => {
  return {
    popover: {
      pointerEvents: "none",
    },
    paper: {
      padding: theme.spacing(1),
    },
    typography: {
      padding: theme.spacing(2),
    },
  };
});

interface MeaningProps {
  editable: boolean;
  definition: DefinitionType;
  showSynonyms: boolean;
  card: CardType;
  translationProviderOrder: Record<string, number>;
  onCardFrontUpdate: (card: CardType) => void;
}

export default function Meaning({
  editable,
  definition,
  showSynonyms,
  card,
  translationProviderOrder,
  onCardFrontUpdate,
}: MeaningProps): ReactElement {
  const { classes } = useStyles();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorElClick, setAnchorElClick] = useState<HTMLElement | null>(null);
  const { fromLang, toLang } = useAppSelector((state) => state.userData.user);
  const translate = useTranslate();
  function handleClickOpen(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setAnchorEl(null);
    if (editable) {
      setAnchorElClick(event.currentTarget);
    } else {
      setAnchorEl(event.currentTarget);
    }
  }
  function handleClickClose() {
    setAnchorEl(null);
    setAnchorElClick(null);
  }
  function handlePopoverOpen(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setAnchorElClick(null);
    setAnchorEl(event.currentTarget);
  }

  const open = Boolean(anchorEl);
  const clickOpen = editable && Boolean(anchorElClick);
  const id = clickOpen ? "simple-popover" : undefined;
  const posTrans: ReactElement[] = [];
  let defaultProvider = "";
  if (!card.front) {
    const translations = orderTranslations(definition.providerTranslations, translationProviderOrder);
    for (const provider of translations.length ? translations : definition.providerTranslations) {
      if (provider.posTranslations.length > 0) {
        let hasValidDefinitions = false;
        for (const posTranslation of provider.posTranslations) {
          const finalList = filterFakeL1Definitions(
            filterUnhelpfulL1Definitions(posTranslation.values.filter((v) => !v.match(definition.graph))),
            cleanedSound(definition, fromLang),
          );
          if (finalList.length > 0) {
            hasValidDefinitions = true;
            posTrans.push(
              <div key={"mean" + posTranslation.posTag}>
                {translate(toPosLabels(posTranslation.posTag, toLang))}: {finalList.join(", ")}
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
        onMouseLeave={() => setAnchorEl(null)}
        onClick={handleClickOpen}
      >
        <MeaningText defaultElements={posTrans} card={card} />
        {showSynonyms && (
          <>
            <SynonymsText synonyms={definition.synonyms} showHr />
          </>
        )}
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
        onClose={() => setAnchorEl(null)}
        disableRestoreFocus
      >
        <DefinitionTranslations
          cleanMeanings
          definition={definition}
          translationProviderOrder={translationProviderOrder}
        />
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
