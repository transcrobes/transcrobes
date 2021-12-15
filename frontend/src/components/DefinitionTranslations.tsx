import { Fragment, ReactElement } from "react";
import { InfoBox, ThinHR } from "./Common";
import PosItem from "./PosItem";
import { DefinitionType, PosTranslationsType, ProviderTranslationType } from "../lib/types";
import { makeStyles, Typography } from "@material-ui/core";
import { filterFakeL1Definitions } from "../lib/lib";

const useStyles = makeStyles({
  translations: { maxWidth: "500px" },
});

interface Props {
  definition: DefinitionType;
  cleanMeanings?: boolean;
}

export default function DefinitionTranslations({ definition, cleanMeanings }: Props): ReactElement {
  const styles = useStyles();

  const phones = definition.sound;
  let providerTranslations: ProviderTranslationType[] = definition.providerTranslations;
  if (cleanMeanings) {
    providerTranslations = [];
    for (const providerTranslation of definition.providerTranslations) {
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
                  <Typography>{providerEntry.provider}</Typography>
                  <div className={styles.translations}>
                    {providerEntry.posTranslations.map((posItem) => {
                      return <PosItem key={posItem.posTag} item={posItem} />;
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
