import { FormControlLabel, FormGroup, Switch } from "@material-ui/core";
import { ChangeEvent, ReactElement } from "react";

interface SwitchProps {
  value: boolean;
  cssClasses: any; // FIXME: any
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
