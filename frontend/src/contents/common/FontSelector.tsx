import { ToggleButtonGroup } from "@mui/material";
import { useAppDispatch } from "../../app/hooks";
import { FontFamily, FontFamilyChinese } from "../../lib/types";

type Props = {
  id: string;
  groupClassName: string;
  buttons: React.ReactNode[];
  currentValue: FontFamilyChinese | FontFamily;
  // FIXME: find out how to pass a typed action...
  setFontFamily: any;
};

export default function FontSelector({ id, groupClassName, buttons, currentValue, setFontFamily }: Props) {
  const dispatch = useAppDispatch();
  return (
    <ToggleButtonGroup
      className={groupClassName}
      value={currentValue}
      exclusive
      onChange={(event: React.MouseEvent<HTMLElement>, value: FontFamily | FontFamilyChinese) => {
        dispatch(setFontFamily({ id, value }));
      }}
    >
      {buttons}
    </ToggleButtonGroup>
  );
}
