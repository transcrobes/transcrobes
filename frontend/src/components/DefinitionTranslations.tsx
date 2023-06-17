import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, Typography } from "@mui/material";
import { Fragment, ReactElement } from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { cleanedSound, filterFakeL1Definitions, orderTranslations } from "../lib/libMethods";
import { DefinitionType, PosTranslationsType, ProviderTranslationType } from "../lib/types";
import { InfoBox, ThinHR } from "./Common";
import PosItem from "./PosItem";

interface Props {
  definition: DefinitionType;
  cleanMeanings?: boolean;
  translationProviderOrder: Record<string, number>;
  onClose?: () => void;
}

export default function DefinitionTranslations({
  definition,
  cleanMeanings,
  translationProviderOrder,
  onClose,
}: Props): ReactElement {
  const dictionaries = useAppSelector((state) => state.dictionary);
  const translate = useTranslate();
  const { fromLang } = useAppSelector((state) => state.userData.user);
  let providerTranslations: ProviderTranslationType[] = [];
  const orderedTranslations =
    orderTranslations(definition.providerTranslations, translationProviderOrder) || definition.providerTranslations;

  if (cleanMeanings) {
    providerTranslations = [];
    for (const providerTranslation of orderedTranslations) {
      const posTranslations: PosTranslationsType[] = [];
      for (const posTrans of providerTranslation.posTranslations) {
        // Remove "meanings" that are just pinyin without tone markings as well as meanings that
        // have the initial word in them, and meanings that aren't proper words (eg. -ize, -footed)
        // const filtered = filterUnhelpfulL1Definitions(posTrans.values.filter((v) => !v.match(definition.graph)));
        const filtered = posTrans.values.filter((v) => !v.match(definition.graph));

        const values = filterFakeL1Definitions(
          filtered,
          cleanedSound(definition, fromLang),
          fromLang,
          providerTranslation.provider === "fbk",
        );
        if (values.length > 0) {
          posTranslations.push({ posTag: posTrans.posTag, values });
        }
      }
      if (posTranslations.length > 0) {
        providerTranslations.push({ provider: providerTranslation.provider, posTranslations });
      }
    }
    if (providerTranslations.length === 0) {
      // if there was nothing clean, just have the dirty stuff.
      providerTranslations = definition.providerTranslations;
    }
  } else {
    providerTranslations = orderedTranslations;
  }
  return (
    <>
      {providerTranslations.length &&
        providerTranslations.map((providerEntry, index) => {
          return (
            providerEntry.posTranslations.length > 0 && (
              <Fragment key={providerEntry.provider}>
                {index > 0 && <ThinHR />}
                <InfoBox>
                  <Typography>{dictionaries[providerEntry.provider] || providerEntry.provider}</Typography>
                  <Box sx={{ maxWidth: "500px" }}>
                    {providerEntry.posTranslations.map((posItem) => {
                      return <PosItem key={posItem.posTag + posItem.sounds} item={posItem} translate={translate} />;
                    })}
                  </Box>
                </InfoBox>
              </Fragment>
            )
          );
        })}
      <Box
        sx={{
          display: { xs: onClose ? "flex" : "none", md: "none" },
          alignItems: "flex-end",
          alignContent: "flex-end",
        }}
      >
        <Button sx={{ ml: "auto", padding: "0.5em" }} size="small" onClick={onClose} startIcon={<CloseIcon />}>
          {translate("ra.action.close")}
        </Button>
      </Box>
    </>
  );
}
