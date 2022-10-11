import { ReactElement } from "react";
import { useAppSelector } from "../../../app/hooks";
import { DefinitionType } from "../../../lib/types";
import { Frequency } from "../../Frequency";

type Props = { definition: DefinitionType };

export default function Infos({ definition }: Props): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <>
      {fromLang === "zh-Hans" && (
        <div>
          {definition.hsk?.levels && definition.hsk.levels.length > 0
            ? `HSK: ${definition.hsk.levels.join(", ")}`
            : "No HSK found"}
        </div>
      )}
      <Frequency frequency={definition.frequency} compact />
    </>
  );
}
