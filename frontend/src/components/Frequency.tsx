import { Box } from "@mui/system";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { FrequencyType } from "../lib/types";

export function Frequency({ frequency: fr, compact }: { frequency: FrequencyType; compact?: boolean }): ReactElement {
  const translate = useTranslate();
  if (!fr || !fr.wcpm) {
    return !compact ? <Box sx={{ marginLeft: "1em" }}>No frequencies found</Box> : <></>;
  } else {
    return (
      <Box>
        <Box
          component={"span"}
          sx={{ fontWeight: !compact ? "bold" : "normal" }}
          title={translate("stats.frequency.description")}
        >
          {translate("stats.frequency.title")}
        </Box>
        {fr.wcpm && (
          <Box
            component={!compact ? "div" : "span"}
            sx={{ marginLeft: "0.7em" }}
            title={translate("stats.frequency.wcpm_description")}
          >
            WCPM: {fr.wcpm}
          </Box>
        )}
        {fr.wcdp && (
          <Box
            component={!compact ? "div" : "span"}
            sx={{ marginLeft: "0.7em" }}
            title={translate("stats.frequency.wcdp_description")}
          >
            WCDP: {fr.wcdp}%
          </Box>
        )}
      </Box>
    );
  }
}
