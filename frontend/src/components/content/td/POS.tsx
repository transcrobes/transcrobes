import { ReactElement } from "react";
import { useAppSelector } from "../../../app/hooks";
import { toPosLabels } from "../../../lib/libMethods";
import { TokenType } from "../../../lib/types";

type Props = { token: TokenType };

export default function POS({ token }: Props): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <div>
      <hr />
      <div>{token.pos ? toPosLabels(token.pos, fromLang) : "POS unknown"}</div>
    </div>
  );
}
