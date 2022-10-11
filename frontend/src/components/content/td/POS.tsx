import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../../../app/hooks";
import { toPosLabels } from "../../../lib/libMethods";
import { TokenType } from "../../../lib/types";

type Props = { token: TokenType };

export default function POS({ token }: Props): ReactElement {
  const toLang = useAppSelector((state) => state.userData.user.toLang);
  const translate = useTranslate();
  return (
    <div>
      <hr />
      <div>{token.pos ? toPosLabels(token.pos, toLang) : translate("general.pos_unknown")}</div>
    </div>
  );
}
