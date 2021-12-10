import { Fragment, ReactElement } from "react";
import { InfoBox, ThinHR } from "./Common";
import PosItem from "./PosItem";
import { DefinitionType } from "../lib/types";
import { Typography } from "@material-ui/core";

export default function DefinitionTranslations({
  definition,
}: {
  definition: DefinitionType;
}): ReactElement {
  return (
    <>
      {definition.providerTranslations.length &&
        definition.providerTranslations.map((providerEntry) => {
          return (
            providerEntry.posTranslations.length > 0 && (
              <Fragment key={providerEntry.provider}>
                <ThinHR />
                <InfoBox>
                  <Typography>{providerEntry.provider}</Typography>
                  <div>
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
