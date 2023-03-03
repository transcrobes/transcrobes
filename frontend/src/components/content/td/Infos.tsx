import { Box } from "@mui/material";
import { ReactElement } from "react";
import { useAppSelector } from "../../../app/hooks";
import { TokenDetailsState } from "../../../features/ui/uiSlice";
import { DefinitionType } from "../../../lib/types";
import { Frequency } from "../../Frequency";
import POS from "./POS";

type Props = {
  definition: DefinitionType;
  tokenDetails: TokenDetailsState;
};

export default function Infos({ definition, tokenDetails }: Props): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "left" }}>
        {fromLang === "zh-Hans" && (
          <div>
            {definition.hsk?.levels && definition.hsk.levels.length > 0
              ? `HSK: ${definition.hsk.levels.join(", ")},`
              : "No HSK found,"}
          </div>
        )}
        <POS token={tokenDetails.token} />
      </Box>
      <Frequency frequency={definition.frequency} compact />
    </>
  );
}
