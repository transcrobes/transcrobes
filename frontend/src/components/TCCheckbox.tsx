import React, { ReactElement } from "react";

interface Props {
  name: string;
  label: string;
  isSelected: boolean;
  onCheckboxChange: React.ChangeEventHandler<HTMLInputElement>;
}

function TCCheckbox({ name, label, isSelected, onCheckboxChange }: Props): ReactElement {
  return (
    <div className="form-check">
      <label htmlFor={name}>
        <input
          type="checkbox"
          name={name}
          checked={isSelected}
          onChange={onCheckboxChange}
          className="form-check-input"
        />
        {label}
      </label>
    </div>
  );
}

export default TCCheckbox;
