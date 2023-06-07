import { Box, Typography } from "@mui/material";
import { ReactElement } from "react";
import type { Translate } from "react-admin";
import { store } from "../app/createStore";
import { toPosLabels } from "../lib/libMethods";
import { PosTranslationsType } from "../lib/types";
import DW from "./DiscoverableWord";

interface Props {
  item: PosTranslationsType;
  discoverableWords?: boolean;
  translate: Translate;
}

export default function PosItem({ item, discoverableWords, translate }: Props): ReactElement {
  // contexts can't be use in renderToString, so we have to get the user from the store and pass translate
  const user = store.getState().userData.user;
  const posLabel = translate(toPosLabels(item.posTag, user.toLang));
  return (
    <Box sx={{ margin: "0.7em" }}>
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
        <Typography>{translate("widgets.pos_items.no_value_found", { value: posLabel })}</Typography>
      )}
    </Box>
  );
}
