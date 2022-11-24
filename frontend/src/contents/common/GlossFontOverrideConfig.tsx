import { ClassNameMap, FormControl, FormControlLabel, Switch } from "@mui/material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { useAppDispatch } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import { FontFamily } from "../../lib/types";
import { ContentConfigProps } from "./ContentConfig";

export default function GlossFontOverrideConfig({
  classes,
  readerConfig,
  actions,
  localClasses,
}: ContentConfigProps & { localClasses: ClassNameMap<string> }): ReactElement {
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  const id = readerConfig.id;
  return (
    <Conftainer label={translate("widgets.gloss_font_override.font_family")} id="ff">
      <FormControl component="fieldset" className={classes.fontSelection || localClasses.fontSelection}>
        <FormControlLabel
          control={<Switch checked={readerConfig.fontFamilyGloss !== "Original"} />}
          label={translate("widgets.gloss_font_override.manual_font_selection")}
          onChange={() =>
            dispatch(
              actions.setFontFamilyGloss({
                id,
                value: readerConfig.fontFamilyGloss === "Original" ? "sans-serif" : "Original",
              }),
            )
          }
        />
        {readerConfig.fontFamilyGloss !== "Original" && (
          <>
            <Conftainer label={translate("widgets.gloss_font_override.gloss_font_family")} id="ffe">
              <ToggleButtonGroup
                className={classes.buttonGroup || localClasses.buttonGroup}
                value={readerConfig.fontFamilyGloss}
                exclusive
                onChange={(event: React.MouseEvent<HTMLElement>, value: FontFamily) => {
                  dispatch(actions.setFontFamilyGloss({ id, value }));
                }}
              >
                <ToggleButton className={classes.button || localClasses.button} value="sans-serif">
                  Sans-Serif
                </ToggleButton>
                <ToggleButton className={classes.button || localClasses.button} value="serif">
                  Serif
                </ToggleButton>
                <ToggleButton className={classes.button || localClasses.button} value="monospace">
                  Monospace
                </ToggleButton>
              </ToggleButtonGroup>
            </Conftainer>
          </>
        )}
      </FormControl>
    </Conftainer>
  );
}
