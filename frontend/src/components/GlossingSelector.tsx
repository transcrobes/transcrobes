import { MenuItem, Select } from "@material-ui/core";
import { ReactElement } from "react";
import { USER_STATS_MODE, USER_STATS_MODE_KEY_VALUES } from "../lib/lib";

interface Props {
  onGlossingChange: (glossing: number) => void;
  className?: string;
  value: USER_STATS_MODE_KEY_VALUES;
}

export default function GlossingSelector({
  onGlossingChange,
  className,
  value,
}: Props): ReactElement {
  return (
    <Select
      className={className}
      value={value}
      label="Glossing"
      onChange={(event) => {
        onGlossingChange(event.target.value as number);
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
