import { FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import React from "react";
import { ReactElement } from "react";
import { WordOrdering } from "../lib/types";

interface Props {
  containerRef?: React.RefObject<HTMLDivElement>;
  onChange: (order: WordOrdering) => void;
  className?: string;
  label?: string;
  name?: string;
  variant?: "filled" | "outlined" | "standard";
  value: WordOrdering;
}

export default function WordOrderSelector({
  containerRef,
  onChange,
  className,
  label,
  name,
  variant,
  value,
}: Props): ReactElement {
  const labl = label || "Ordering";
  return (
    <>
      <FormControl variant={variant || "outlined"} className={className}>
        <InputLabel id="word-order-select-label">{labl}</InputLabel>
        <Select
          variant={variant || "outlined"}
          labelId="word-order-select-label"
          id="word-order-select"
          name={name}
          MenuProps={{ container: containerRef?.current }}
          value={value}
          label={labl}
          onChange={(event) => {
            onChange(event.target.value as WordOrdering);
          }}
        >
          <MenuItem value="Personal">Personalised</MenuItem>
          <MenuItem value="Natural">Import order/Freq</MenuItem>
          <MenuItem value="WCPM">Word Count/million</MenuItem>
        </Select>
      </FormControl>
    </>
  );
}
