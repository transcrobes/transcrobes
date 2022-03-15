import { makeStyles, Typography } from "@material-ui/core";
import { Fragment, ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
import { filterFakeL1Definitions, orderTranslations } from "../lib/libMethods";
import { DefinitionType, PosTranslationsType, ProviderTranslationType } from "../lib/types";
import { InfoBox, ThinHR } from "./Common";
import PosItem from "./PosItem";

const useStyles = makeStyles({
  translations: { maxWidth: "500px" },
});

interface Props {
  definition: DefinitionType;
  cleanMeanings?: boolean;
  translationProviderOrder: Record<string, number>;
}

export default function DefinitionTranslations({
  definition,
  cleanMeanings,
  translationProviderOrder,
}: Props): ReactElement {
  const styles = useStyles();
  const dictionaries = useAppSelector((state) => state.dictionary);
  const phones = definition.sound;
  let providerTranslations: ProviderTranslationType[] = [];
  const orderedTranslations =
    orderTranslations(definition.providerTranslations, translationProviderOrder) || definition.providerTranslations;

  if (cleanMeanings) {
    providerTranslations = [];
    for (const providerTranslation of orderedTranslations) {
      const posTranslations: PosTranslationsType[] = [];
      for (const posTrans of providerTranslation.posTranslations) {
        // Remove "meanings" that are just pinyin without tone markings as well as meanings that
        // have the initial word in them
        const values = filterFakeL1Definitions(
          posTrans.values.filter((v) => !v.match(definition.graph)),
          phones,
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
                  <div className={styles.translations}>
                    {providerEntry.posTranslations.map((posItem) => {
                      return <PosItem key={posItem.posTag + posItem.sounds} item={posItem} />;
                    })}
                  </div>
                </InfoBox>
              </Fragment>
            )
          );
        })}
    </>
  );
}
