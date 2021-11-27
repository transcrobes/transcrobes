import { ChangeEvent, ReactElement } from "react";
import { FormControlLabel, FormGroup, Switch } from "@material-ui/core";

interface SwitchProps {
  value: boolean;
  cssClasses: any; // FIXME: any
  onValueChange: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void;
}

function SubSegmentation({ cssClasses, value, onValueChange }: SwitchProps): ReactElement {
  return (
    <div title="Segmentation" className={cssClasses.switch}>
      <FormGroup>
        <FormControlLabel
          className={cssClasses.switch}
          control={<Switch defaultChecked={value} onChange={onValueChange} />}
          label="Segmentation"
        />
      </FormGroup>
    </div>
  );
}

export default SubSegmentation;
