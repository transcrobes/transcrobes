import { Typography } from "@material-ui/core";
import { ReactElement } from "react";
import { store } from "../app/createStore";
import { toPosLabels } from "../lib/libMethods";
import { PosTranslationsType } from "../lib/types";
import { InfoBox } from "./Common";

interface Props {
  item: PosTranslationsType;
}

export default function PosItem({ item }: Props): ReactElement {
  const user = store.getState().userData.user;
  const posLabel = toPosLabels(item.posTag, user?.fromLang || "zh-Hans");
  return (
    <InfoBox>
      {item.values.length > 0 ? (
        <Typography>
          <span style={{ fontWeight: "bold" }}>{posLabel}: </span>
          {item.sounds && <span>{item.sounds}: </span>}
          <span>{item.values.join(", ")}</span>
        </Typography>
      ) : (
        <Typography>No {posLabel} found</Typography>
      )}
    </InfoBox>
  );
}
