import { ReactElement } from "react";
import { DefinitionType } from "../../../lib/types";
import { Frequency } from "../../Frequency";

type Props = { definition: DefinitionType };

export default function Infos({ definition }: Props): ReactElement {
  const hsk =
    definition.hsk.levels && definition.hsk.levels.length > 0
      ? `HSK: ${definition.hsk.levels.join(", ")}`
      : "No HSK found";

  return (
    <>
      <div>{hsk}</div>
      <Frequency frequency={definition.frequency} compact />
    </>
  );
}
