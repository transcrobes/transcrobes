import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import { ReactElement } from "react";
import { TokenDetailsState } from "../../../features/ui/uiSlice";
import { DefinitionState } from "../../../lib/types";
import Actions from "./Actions";
import Definitions from "./Definitions";
import Infos from "./Infos";
import POS from "./POS";
import Synonyms from "./Synonyms";

type Props = {
  tokenDetails: TokenDetailsState;
  definition: DefinitionState;
  classes: ClassNameMap<string>;
};

export default function Container({ tokenDetails, definition, classes }: Props): ReactElement {
  return (
    <div className={classes.container}>
      <Infos definition={definition} />
      <POS token={tokenDetails.token} />
      <Synonyms token={tokenDetails.token} definition={definition} />
      <hr />
      <Actions className={classes.actions} tokenDetails={tokenDetails} definition={definition} />
      <Definitions definition={definition} classes={classes} />
    </div>
  );
}
