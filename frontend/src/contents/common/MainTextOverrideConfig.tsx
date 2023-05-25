import { ClassNameMap, FormControl, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from "@mui/material";
import _ from "lodash";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { HslColor } from "react-colorful";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { Conftainer as BasicConftainer, DEFAULT_FONT_COLOUR } from "../../components/Common";
import Conftainer from "../../components/Conftainer";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import FontColour from "../../components/FontColour";
import { hasTones, needsLatinFont } from "../../lib/funclib";
import FontSelector from "./FontSelector";
import { ContentConfigProps } from "./ContentConfig";
import { FontColourType } from "../../lib/types";

type ColourScheme = "none" | "tones" | "coloured";

function latinFontButtons(buttonClassName: string) {
  return [
    <ToggleButton className={buttonClassName} key="sans-serif" value="sans-serif">
      Sans-Serif
    </ToggleButton>,
    <ToggleButton className={buttonClassName} key="serif" value="serif">
      Serif
    </ToggleButton>,
    <ToggleButton className={buttonClassName} key="monospace" value="monospace">
      Monospace
    </ToggleButton>,
    <ToggleButton className={buttonClassName} key="opendyslexic" value="opendyslexic">
      Dyslexia-Friendly
    </ToggleButton>,
  ];
}
function chineseFontButtons(buttonClassName: string) {
  return [
    <ToggleButton className={buttonClassName} key="notasanslight" value="notasanslight">
      Nota Sans
    </ToggleButton>,
    <ToggleButton className={buttonClassName} key="notaserifextralight" value="notaserifextralight">
      Nota Serif light
    </ToggleButton>,
    <ToggleButton className={buttonClassName} key="notaserifregular" value="notaserifregular">
      Nota Serif Normal
    </ToggleButton>,
    <ToggleButton className={buttonClassName} key="mashanzheng" value="mashanzheng">
      Ma Shan Zheng
    </ToggleButton>,
  ];
}

function fontColourSchemeFromFontColour(fontColour: FontColourType): ColourScheme {
  if (!fontColour) {
    return "none";
  } else if (fontColour === "tones") {
    return "tones";
  } else {
    return "coloured";
  }
}

export default function MainTextOverrideConfig({
  classes,
  readerConfig,
  actions,
  localClasses,
}: ContentConfigProps & { localClasses: ClassNameMap<string> }): ReactElement {
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  const [fontColourScheme, setFontColourScheme] = useState<ColourScheme>(
    fontColourSchemeFromFontColour(readerConfig.fontColour),
  );
  const id = readerConfig.id;
  const changeFontColour = useCallback(
    _.debounce((value: HslColor) => {
      dispatch(actions.setFontColour({ id, value }));
    }, 250),
    [],
  );
  const { fromLang, toLang } = useAppSelector((state) => state.userData.user);
  return (
    <>
      <Conftainer label={translate("widgets.main_text_override.font_family")} id="ff">
        <FormControl component="fieldset" className={classes.fontSelection || localClasses.fontSelection}>
          <FormControlLabel
            control={<Switch checked={readerConfig.fontFamilyGloss !== "Original"} />}
            label={translate("widgets.main_text_override.manual_font_selection")}
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
              <Conftainer label={translate("widgets.main_text_override.gloss_font_family")} id="ffe">
                <FontSelector
                  id={readerConfig.id}
                  buttons={
                    needsLatinFont(toLang)
                      ? latinFontButtons(classes.button || localClasses.button)
                      : chineseFontButtons(classes.button || localClasses.button)
                  }
                  currentValue={readerConfig.fontFamilyGloss}
                  groupClassName={classes.buttonGroup || localClasses.buttonGroup}
                  setFontFamily={actions.setFontFamilyGloss}
                />
              </Conftainer>
              <Conftainer label={translate("widgets.main_text_override.main_font_family")} id="ffc">
                <FontSelector
                  id={readerConfig.id}
                  buttons={
                    needsLatinFont(fromLang)
                      ? latinFontButtons(classes.button || localClasses.button)
                      : chineseFontButtons(classes.button || localClasses.button)
                  }
                  currentValue={readerConfig.fontFamilyMain}
                  groupClassName={classes.buttonGroup || localClasses.buttonGroup}
                  setFontFamily={actions.setFontFamilyMain}
                />
              </Conftainer>
            </>
          )}
        </FormControl>
      </Conftainer>
      <Conftainer label={translate("widgets.main_text_override.font_size")} id="fontSize">
        <FivePercentFineControl
          onValueChange={(value) => dispatch(actions.setFontSize({ id, value: value || 1 }))}
          value={readerConfig.fontSize}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>
      <Conftainer label={translate("widgets.main_text_override.text_colour")} id="otc">
        {hasTones(fromLang) ? (
          <>
            <ToggleButtonGroup
              className={classes.buttonGroup || localClasses.buttonGroup}
              value={fontColourSchemeFromFontColour(readerConfig.fontColour)}
              exclusive
              onChange={(event: React.MouseEvent<HTMLElement>, value: ColourScheme) => {
                let val: FontColourType = null;
                if (value === "coloured") {
                  val = DEFAULT_FONT_COLOUR;
                } else if (value === "tones") {
                  val = "tones";
                }
                dispatch(actions.setFontColour({ id, value: val }));
                setFontColourScheme(value);
              }}
            >
              <ToggleButton className={classes.button || localClasses.button} value={"none"}>
                {translate("widgets.main_text_override.override_type.none")}
              </ToggleButton>
              <ToggleButton className={classes.button || localClasses.button} value={"tones"}>
                {translate("widgets.main_text_override.override_type.tones")}
              </ToggleButton>
              <ToggleButton className={classes.button || localClasses.button} value={"coloured"}>
                {translate("widgets.main_text_override.override_type.coloured")}
              </ToggleButton>
            </ToggleButtonGroup>
            {fontColourScheme === "coloured" && !!readerConfig.fontColour && readerConfig.fontColour !== "tones" && (
              <BasicConftainer>
                <FontColour
                  value={readerConfig.fontColour}
                  label=""
                  className={localClasses.fineControlIcons}
                  onValueChange={changeFontColour}
                />
              </BasicConftainer>
            )}
          </>
        ) : (
          <FormControl component="fieldset" className={classes.fontColour || localClasses.fontColour}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!readerConfig.fontColour}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                    dispatch(actions.setFontColour({ id, value: checked ? DEFAULT_FONT_COLOUR : null }))
                  }
                />
              }
              label={translate("widgets.main_text_override.override_text_colour")}
            />
            {!!readerConfig.fontColour && readerConfig.fontColour !== "tones" && (
              <BasicConftainer>
                <FontColour
                  value={readerConfig.fontColour}
                  label=""
                  className={localClasses.fineControlIcons}
                  onValueChange={changeFontColour}
                />
              </BasicConftainer>
            )}
          </FormControl>
        )}
      </Conftainer>
    </>
  );
}
