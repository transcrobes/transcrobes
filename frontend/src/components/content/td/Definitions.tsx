import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import { Fragment, ReactElement } from "react";
import { useAppSelector } from "../../../app/hooks";
import { toSimplePosLabels } from "../../../lib/libMethods";
import { DefinitionType, SIMPLE_POS_TYPES } from "../../../lib/types";

type Props = {
  definition: DefinitionType;
  classes: ClassNameMap<string>;
};

export default function Definitions({ definition, classes }: Props): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <>
      {definition.providerTranslations
        .filter((provider) => provider.posTranslations.length > 0)
        .map((provider) => {
          return (
            <Fragment key={provider.provider}>
              <hr />
              <div className={classes.source} key={provider.provider}>
                <div className={classes.sourceName}>{provider.provider}</div>
                {provider.posTranslations.map((translation) => {
                  return (
                    <Fragment key={provider.provider + translation.posTag}>
                      <div className={classes.sourcePos}>
                        {toSimplePosLabels(translation.posTag as SIMPLE_POS_TYPES, fromLang)}
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
