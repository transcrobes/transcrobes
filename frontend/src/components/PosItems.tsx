import { Box } from "@mui/material";
import { ReactElement } from "react";
import { ProviderTranslationType } from "../lib/types";
import PosItem from "./PosItem";

interface Props {
  providerEntry: ProviderTranslationType;
}

export default function PosItems({ providerEntry }: Props): ReactElement {
  return (
    <Box sx={{ maxWidth: "500px" }}>
      {providerEntry.posTranslations.map((posItem) => {
        return <PosItem key={posItem.posTag} item={posItem} />;
      })}
    </Box>
  );
}
