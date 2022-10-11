import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import React, { ReactElement } from "react";
import { useTranslate } from "react-admin";
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
  const translate = useTranslate();
  const labl = label || translate("widgets.word_order_selector.ordering");
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
          <MenuItem value="Personal">{translate("widgets.word_order_selector.personal")}</MenuItem>
          <MenuItem value="Natural">{translate("widgets.word_order_selector.natural")}</MenuItem>
          <MenuItem value="WCPM">{translate("widgets.word_order_selector.wcpm")}</MenuItem>
        </Select>
      </FormControl>
    </>
  );
}
