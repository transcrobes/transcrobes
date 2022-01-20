import { Typography } from "@material-ui/core";
import { ReactElement } from "react";
import { store } from "../app/createStore";
import { toSimplePosLabels } from "../lib/libMethods";
import { PosTranslationsType, SIMPLE_POS_TYPES } from "../lib/types";
import { InfoBox } from "./Common";

interface Props {
  item: PosTranslationsType;
}

export default function PosItem({ item }: Props): ReactElement {
  const user = store.getState().userData.user;
  const posLabel = toSimplePosLabels(item.posTag as SIMPLE_POS_TYPES, user?.fromLang || "zh-Hans");
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
