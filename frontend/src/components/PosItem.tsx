import { Typography } from "@mui/material";
import { ReactElement } from "react";
import { store } from "../app/createStore";
import { toPosLabels } from "../lib/libMethods";
import { PosTranslationsType } from "../lib/types";
import { InfoBox } from "./Common";
import DW from "./DiscoverableWord";

interface Props {
  item: PosTranslationsType;
  discoverableWords?: boolean;
}

export default function PosItem({ item, discoverableWords }: Props): ReactElement {
  // FIXME: remember why I'm not using useAppSelector here
  const user = store.getState().userData.user;
  const posLabel = toPosLabels(item.posTag, user.toLang);
  return (
    <InfoBox>
      {item.values.length > 0 ? (
        <Typography>
          <span style={{ fontWeight: "bold" }}>{posLabel}: </span>
          {item.sounds && <span>{item.sounds}: </span>}
          <span>
            {(discoverableWords &&
              item.values
                .map<React.ReactNode>((v) => <DW key={v} graph={v} />)
                .reduce((prev, curr) => [prev, ", ", curr])) ||
              item.values.join(", ")}
          </span>
        </Typography>
      ) : (
        <Typography>No {posLabel} found</Typography>
      )}
    </InfoBox>
  );
}
