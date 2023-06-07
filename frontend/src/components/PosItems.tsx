import { Box } from "@mui/material";
import { ReactElement } from "react";
import type { Translate } from "react-admin";
import { ProviderTranslationType } from "../lib/types";
import PosItem from "./PosItem";

interface Props {
  providerEntry: ProviderTranslationType;
  translate: Translate;
}

export default function PosItems({ providerEntry, translate }: Props): ReactElement {
  return (
    <Box sx={{ maxWidth: "500px" }}>
      {providerEntry.posTranslations.map((posItem) => {
        return <PosItem key={posItem.posTag} item={posItem} translate={translate} />;
      })}
    </Box>
  );
}
