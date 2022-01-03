import { MenuItem, Select } from "@material-ui/core";
import { ReactElement } from "react";
import { FontFamily } from "../types";

interface Props {
  containerRef?: React.RefObject<HTMLDivElement>;
  onChange: (fontFamily: FontFamily) => void;
  className?: string;
  value: FontFamily;
}

export default function FontSelector({
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
      label="Font Family"
      onChange={(event) => {
        onChange(event.target.value as FontFamily);
      }}
    >
      <MenuItem value="Original">Original</MenuItem>
      <MenuItem value="serif">Serif</MenuItem>
      <MenuItem value="sans-serif">Sans-Serif</MenuItem>
      <MenuItem value="opendyslexic">Dyslexia-Friendly</MenuItem>
    </Select>
  );
}
