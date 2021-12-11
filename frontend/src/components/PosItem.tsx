import { Typography } from "@material-ui/core";
import { ReactElement } from "react";
import { toSimplePosLabels } from "../lib/lib";
import { PosTranslationsType, SIMPLE_POS_TYPES } from "../lib/types";
import { InfoBox } from "./Common";

interface Props {
  item: PosTranslationsType;
}

export default function PosItem({ item }: Props): ReactElement {
  const posLabel = toSimplePosLabels(item.posTag as SIMPLE_POS_TYPES);
  return (
    <InfoBox>
      {item.values.length > 0 ? (
        <Typography>
          <span style={{ fontWeight: "bold" }}>{posLabel}: </span>
          <span>{item.values.join(", ")}</span>
        </Typography>
      ) : (
        <Typography>No {posLabel} found</Typography>
      )}
    </InfoBox>
  );
}
