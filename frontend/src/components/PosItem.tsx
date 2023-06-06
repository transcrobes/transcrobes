import { Typography } from "@mui/material";
import { ReactElement } from "react";
import { toPosLabels } from "../lib/libMethods";
import { PosTranslationsType } from "../lib/types";
import { InfoBox } from "./Common";
import DW from "./DiscoverableWord";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";

interface Props {
  item: PosTranslationsType;
  discoverableWords?: boolean;
}

export default function PosItem({ item, discoverableWords }: Props): ReactElement {
  const translate = useTranslate();
  const user = useAppSelector((state) => state.userData.user);
  const posLabel = translate(toPosLabels(item.posTag, user.toLang));
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
        <Typography>{translate("widgets.pos_items.no_value_found", { value: posLabel })}</Typography>
      )}
    </InfoBox>
  );
}
