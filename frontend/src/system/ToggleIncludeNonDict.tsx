import { FormControlLabel, Switch } from "@mui/material";
import { useStore, useTranslate } from "ra-core";

export default function ToggleIncludeNonDict() {
  const translate = useTranslate();
  const [includeNonDict, setIncludeNonDict] = useStore("preferences.includeNonDict", false);
  return (
    <FormControlLabel
      control={<Switch size="medium" checked={includeNonDict} onChange={() => setIncludeNonDict(!includeNonDict)} />}
      label={translate("screens.system.include_non_dict")}
      labelPlacement="end"
    />
  );
}
