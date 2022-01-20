import { ReactElement } from "react";
import { DefinitionType } from "../../../lib/types";

type Props = { definition: DefinitionType };

export default function Infos({ definition }: Props): ReactElement {
  const hsk =
    definition.hsk.levels && definition.hsk.levels.length > 0
      ? `HSK: ${definition.hsk.levels.join(", ")}`
      : "No HSK found";

  // const vals = `Frequency: wcpm: ${frq.wcpm}, wcdp: ${frq.wcdp}, pos: ${frq.pos}, pos freq: ${frq.posFreq}`;
  const frq =
    definition.frequency && definition.frequency.wcpm
      ? `Frequency: wcpm: ${definition.frequency.wcpm}, wcdp: ${definition.frequency.wcdp}`
      : "No Frequencies found";
  return (
    <>
      <div>{hsk}</div>
      <div>{frq}</div>
    </>
  );
}
