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
      <label htmlFor={name}>
        <input
          type="checkbox"
          name={name}
          checked={isSelected}
          onChange={onCheckboxChange}
          // className="form-check-input"
        />
        {label}
      </label>
    </div>
  );
}

export default TCCheckbox;
