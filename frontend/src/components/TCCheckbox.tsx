import { FormControlLabel, Switch } from "@material-ui/core";
import React, { ReactElement } from "react";

interface Props {
  name: string;
  label: string;
  isSelected: boolean;
  className?: string;
  onCheckboxChange: React.ChangeEventHandler<HTMLInputElement>;
}

function TCCheckbox({ name, label, isSelected, className, onCheckboxChange }: Props): ReactElement {
  return (
    <div className={className}>
      <FormControlLabel
        control={
          <Switch name={name} size="small" checked={isSelected} onChange={onCheckboxChange} />
        }
        label={label}
        labelPlacement="end"
        className={className}
      />
    </div>
  );
}

export default TCCheckbox;
