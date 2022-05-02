import { ClassNameMap, FormControlLabel, FormGroup, Switch } from "@mui/material";
import { ChangeEvent, ReactElement } from "react";

interface SwitchProps {
  value: boolean;
  cssClasses: ClassNameMap<"switch">;
  label: string;
  onValueChange: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void;
}

function SubSwitch({ cssClasses, value, label, onValueChange }: SwitchProps): ReactElement {
  return (
    <div title={label} className={cssClasses.switch}>
      <FormGroup>
        <FormControlLabel
          className={cssClasses.switch}
          control={<Switch defaultChecked={value} onChange={onValueChange} />}
          label={label}
        />
      </FormGroup>
    </div>
  );
}

export default SubSwitch;
