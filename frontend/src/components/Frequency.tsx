import { Box } from "@mui/system";
import { ReactElement } from "react";
import { FrequencyType } from "../lib/types";

export function Frequency({ frequency: fr, compact }: { frequency: FrequencyType; compact?: boolean }): ReactElement {
  if (!fr) {
    return !compact ? <Box sx={{ marginLeft: "1em" }}>No frequencies found</Box> : <></>;
  } else {
    return (
      <Box>
        <Box
          component={"span"}
          sx={{ fontWeight: !compact ? "bold" : "normal" }}
          title="Frequency in the Subtlex Open Subtitles database"
        >
          Frequency:
        </Box>
        {fr.wcpm && (
          <Box component={!compact ? "div" : "span"} sx={{ marginLeft: "0.7em" }} title="Word Count Per Million">
            WCPM: {fr.wcpm}
          </Box>
        )}
        {fr.wcdp && (
          <Box
            component={!compact ? "div" : "span"}
            sx={{ marginLeft: "0.7em" }}
            title="Percentage of all films where the word appears"
          >
            WCDP: {fr.wcdp}%
          </Box>
        )}
      </Box>
    );
  }
}
