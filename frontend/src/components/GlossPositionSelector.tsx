import { MenuItem, Select } from "@mui/material";
import { ReactElement } from "react";
import { GlossPosition } from "../lib/types";

interface Props {
  containerRef?: React.RefObject<HTMLDivElement>;
  onChange: (glossPosition: GlossPosition) => void;
  className?: string;
  value: GlossPosition;
}

export default function GlossingPositionSelector({ containerRef, onChange, className, value }: Props): ReactElement {
  return (
    <Select
      MenuProps={{ container: containerRef?.current }}
      className={className}
      value={value}
      label="Gloss Position"
      onChange={(event) => {
        onChange(event.target.value as GlossPosition);
      }}
    >
      <MenuItem value={"row"}>After</MenuItem>
      <MenuItem value={"column"}>Below</MenuItem>
      <MenuItem value={"column-reverse"}>Above</MenuItem>
      <MenuItem value={"row-reverse"}>Before</MenuItem>
    </Select>
  );
}
