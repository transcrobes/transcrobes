import { Box } from "@mui/material";
import { ReactElement } from "react";
import { DefinitionType, InputLanguage } from "../lib/types";
import SoundBox from "./SoundBox";
import { cleanedSound } from "../lib/libMethods";

// FIXME: what about properly typing the leftMargin...
export default function Sound({
  definition,
  fromLang,
  marginLeft = "0.2em",
}: {
  definition: DefinitionType;
  fromLang: InputLanguage;
  marginLeft?: string;
}): ReactElement {
  return (
    <Box>
      {cleanedSound(definition, fromLang).map((s, index) => (
        <SoundBox key={`${s}${index}`} sound={s} index={index} marginLeft={marginLeft} />
      ))}
    </Box>
  );
}
