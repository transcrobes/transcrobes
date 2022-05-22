import { ReactElement, useEffect, useState } from "react";
import { useAppSelector } from "../../../app/hooks";
import { toSimplePos } from "../../../lib/libMethods";
import { DefinitionType, TokenType } from "../../../lib/types";
import DiscoverableWord from "../../DiscoverableWord";

type Props = {
  token: TokenType;
  definition: DefinitionType;
};

export default function Synonyms({ token, definition }: Props): ReactElement {
  const [syns, setSyns] = useState<string[]>([]);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  useEffect(() => {
    if (token.pos) {
      const synonyms = definition.synonyms.filter(
        (x) => toSimplePos(x.posTag, fromLang) === toSimplePos(token.pos!, fromLang),
      );
      setSyns(synonyms[0]?.values);
    }
  }, [token]);

  return syns.length > 0 ? (
    <div>
      <hr />
      <span>
        {syns
          .map<React.ReactNode>((v) => <DiscoverableWord newTab key={v} graph={v} />)
          .reduce((prev, curr) => [prev, ", ", curr]) || syns.join(", ")}
      </span>
    </div>
  ) : (
    <></>
  );
}
