import { Box } from "@mui/material";
import { ReactElement } from "react";
import { useAppSelector } from "../../../app/hooks";
import { TokenDetailsState } from "../../../features/ui/uiSlice";
import { DefinitionType } from "../../../lib/types";
import { Frequency } from "../../Frequency";
import POS from "./POS";
import { useTranslate } from "react-admin";

type Props = {
  definition: DefinitionType;
  tokenDetails: TokenDetailsState;
};

export default function Infos({ definition, tokenDetails }: Props): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const translate = useTranslate();
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "left" }}>
        {fromLang === "zh-Hans" && (
          <div>
            {definition.hsk?.levels && definition.hsk.levels.length > 0
              ? translate("widgets.popup.hsk_level", { hsk: definition.hsk.levels.join(", ") })
              : translate("widgets.popup.no_hsk")}
          </div>
        )}
        <POS token={tokenDetails.token} />
      </Box>
      <Frequency frequency={definition.frequency} compact />
    </>
  );
}
