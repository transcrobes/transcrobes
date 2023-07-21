import { FormControlLabel, Switch } from "@mui/material";
import { useStore, useTranslate } from "ra-core";

export default function ToggleIncludeIgnored() {
  const translate = useTranslate();
  const [includeIgnored, setIncludeIgnored] = useStore("preferences.includeIgnored", false);
  return (
    <FormControlLabel
      control={<Switch size="medium" checked={includeIgnored} onChange={() => setIncludeIgnored(!includeIgnored)} />}
      label={translate("screens.system.includeIgnored")}
      labelPlacement="end"
    />
  );
}
