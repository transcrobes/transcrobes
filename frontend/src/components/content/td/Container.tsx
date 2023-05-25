import { ClassNameMap, Box, Divider } from "@mui/material";
import { ReactElement } from "react";
import { useAppSelector } from "../../../app/hooks";
import { TokenDetailsState } from "../../../features/ui/uiSlice";
import { hasCharacters } from "../../../lib/funclib";
import { DefinitionState } from "../../../lib/types";
import Actions from "./Actions";
import Definitions from "./Definitions";
import Infos from "./Infos";
import Substrings from "./Substrings";
import Synonyms from "./Synonyms";

type Props = {
  tokenDetails: TokenDetailsState;
  definition: DefinitionState;
  classes: ClassNameMap<string>;
};

export default function Container({ tokenDetails, definition, classes }: Props): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <Box className={classes.container}>
      <Infos definition={definition} tokenDetails={tokenDetails} />
      <Synonyms token={tokenDetails.token} definition={definition} />
      <Divider />
      <Actions className={classes.actions} tokenDetails={tokenDetails} definition={definition} />
      <Definitions definition={definition} classes={classes} />
      {hasCharacters(fromLang) && tokenDetails.token.l.length > 1 && (
        <>
          <Divider /> <Substrings token={tokenDetails.token} fromLang={fromLang} />
        </>
      )}
    </Box>
  );
}
