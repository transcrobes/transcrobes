import { Popover, popoverClasses } from "@mui/material";
import { ReactElement, useState } from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { cleanedSound, filterFakeL1Definitions, orderTranslations, toPosLabels } from "../lib/libMethods";
import { CardType, DefinitionType } from "../lib/types";
import DefinitionTranslations from "./DefinitionTranslations";
import EditableDefinitionTranslations from "./EditableDefinitionTranslations";
import MeaningText from "./MeaningText";
import SynonymsText from "./SynonymsText";

interface MeaningProps {
  editable: boolean;
  definition: DefinitionType;
  showSynonyms: boolean;
  card: CardType;
  translationProviderOrder: Record<string, number>;
  showAnswer?: boolean;
  onCardFrontUpdate: (cardId: string, frontString: string) => void;
}

export default function Meaning({
  editable,
  definition,
  showSynonyms,
  card,
  translationProviderOrder,
  onCardFrontUpdate,
  showAnswer,
}: MeaningProps): ReactElement {
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
  const touch = matchMedia("(hover: none)").matches;
  const open = Boolean(anchorEl);
  const clickOpen = editable && Boolean(anchorElClick);
  const id = clickOpen ? "simple-popover" : undefined;
  const posTrans: ReactElement[] = [];
  let defaultProvider = "";
  if (!card.front) {
    const allTrans: Record<string, ReactElement[]> = {};
    const translations = orderTranslations(definition.providerTranslations, translationProviderOrder);
    for (const provider of translations.length ? translations : definition.providerTranslations) {
      allTrans[provider.provider] = [];
      if (provider.posTranslations.length > 0) {
        let hasValidDefinitions = false;
        for (const posTranslation of provider.posTranslations) {
          const withoutGraph = posTranslation.values.filter((v) => !v.match(definition.graph));
          const finalList = filterFakeL1Definitions(
            withoutGraph,
            cleanedSound(definition, fromLang),
            fromLang,
            provider.provider === "fbk",
          );
          if (finalList.length > 0) {
            hasValidDefinitions = true;
            posTrans.push(
              <div key={"mean" + posTranslation.posTag}>
                {translate(toPosLabels(posTranslation.posTag, toLang))}: {finalList.join(", ")}
              </div>,
            );
          } else {
            allTrans[provider.provider].push(
              <div key={"mean" + posTranslation.posTag}>
                {translate(toPosLabels(posTranslation.posTag, toLang))}: {posTranslation.values.join(", ")}
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
    if (posTrans.length === 0) {
      // we've got nothing at all, let's show the first provider with something, even if it's bad
      for (let i = 0; i < Object.keys(allTrans).length; i++) {
        if (Object.keys(allTrans)[i].length > 0) {
          defaultProvider = Object.keys(allTrans)[0];
          posTrans.push(...allTrans[defaultProvider]);
          break;
        }
      }
    }
  }
  return (
    <div>
      <div>
        <div
          aria-owns={open ? "mouse-over-popover" : undefined}
          aria-haspopup="true"
          onMouseEnter={handlePopoverOpen}
          onMouseLeave={() => setAnchorEl(null)}
          onClick={handleClickOpen}
        >
          <MeaningText defaultElements={posTrans} card={card} />
          {showSynonyms && <SynonymsText synonyms={definition.synonyms} showHr />}
        </div>
        <Popover
          id="mouse-over-popover"
          sx={{
            pointerEvents: touch ? "auto" : "none",
            [`& .${popoverClasses.paper}`]: {
              gap: 1,
            },
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
            onClose={handleClickClose}
            cleanMeanings={!showAnswer}
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
            onClose={handleClickClose}
            definition={definition}
            card={card}
            defaultProvider={defaultProvider}
            onUpdate={onCardFrontUpdate}
          />
        </Popover>
      </div>
    </div>
  );
}
