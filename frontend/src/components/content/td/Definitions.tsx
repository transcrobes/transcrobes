import { ClassNameMap } from "@mui/material";
import { Fragment, ReactElement, useContext, useEffect, useState } from "react";
import { useAppSelector } from "../../../app/hooks";
import { orderTranslations, toPosLabels } from "../../../lib/libMethods";
import { DefinitionType, ProviderTranslationType } from "../../../lib/types";
import { ReaderConfigContext } from "../../ReaderConfigProvider";

type Props = {
  definition: DefinitionType;
  classes: ClassNameMap<string>;
};

export default function Definitions({ definition, classes }: Props): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const dictionaries = useAppSelector((state) => state.dictionary);
  const { readerConfig } = useContext(ReaderConfigContext);
  const [orderedTranslations, setOrderedTranslations] = useState<ProviderTranslationType[]>([]);

  useEffect(() => {
    setOrderedTranslations(orderTranslations(definition.providerTranslations, readerConfig.translationProviderOrder));
  }, [readerConfig.translationProviderOrder, definition]);

  return (
    <>
      {orderedTranslations.map((provider) => {
        return (
          <Fragment key={provider.provider}>
            <hr />
            <div className={classes.source} key={provider.provider}>
              <div className={classes.sourceName}>{dictionaries[provider.provider] || provider.provider}</div>
              {provider.posTranslations.map((translation) => {
                return (
                  <Fragment key={provider.provider + translation.posTag + translation.sounds}>
                    <div className={classes.sourcePos}>
                      {toPosLabels(translation.posTag, fromLang)} {translation.sounds}
                    </div>
                    <div className={classes.sourcePosDefs}>
                      <span>{translation.values.join(", ")}</span>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
