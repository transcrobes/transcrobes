import { MenuItem, Select } from "@mui/material";
import { ReactElement } from "react";
import { USER_STATS_MODE, USER_STATS_MODE_KEY_VALUES } from "../lib/types";

interface Props {
  containerRef?: React.RefObject<HTMLDivElement>;
  onChange: (glossing: number) => void;
  className?: string;
  value: USER_STATS_MODE_KEY_VALUES;
}

export default function GlossingSelector({
  containerRef,
  onChange,
  className,
  value,
}: Props): ReactElement {
  return (
    <Select
      MenuProps={{ container: containerRef?.current }}
      className={className}
      value={value}
      label="Glossing"
      onChange={(event) => {
        onChange(event.target.value as number);
      }}
    >
      <MenuItem value={USER_STATS_MODE.NO_GLOSS}>None</MenuItem>
      <MenuItem value={USER_STATS_MODE.L2_SIMPLIFIED}>Simpler</MenuItem>
      <MenuItem value={USER_STATS_MODE.TRANSLITERATION}>Sounds</MenuItem>
      <MenuItem value={USER_STATS_MODE.L1}>English</MenuItem>
      <MenuItem value={USER_STATS_MODE.TRANSLITERATION_L1}>Sounds + English</MenuItem>
    </Select>
  );
}
