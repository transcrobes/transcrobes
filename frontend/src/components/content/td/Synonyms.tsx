import { ReactElement, useEffect, useState } from "react";
import { useAppSelector } from "../../../app/hooks";
import { toSimplePos } from "../../../lib/libMethods";
import { DefinitionType, TokenType } from "../../../lib/types";

type Props = {
  token: TokenType;
  definition: DefinitionType;
};

export default function Synonyms({ token, definition }: Props): ReactElement {
  const [synString, setSynString] = useState("");
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  useEffect(() => {
    if (token.pos) {
      const pos = toSimplePos(token.pos, fromLang);
      const syns = definition.synonyms.filter((x) => x.posTag === pos);
      setSynString(syns[0]?.values.join(", "));
    }
  }, [token]);

  return synString ? (
    <div>
      <hr />
      <div>{synString}</div>
    </div>
  ) : (
    <></>
  );
}
