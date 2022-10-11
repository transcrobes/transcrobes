import { ClassNameMap, FormControl, FormControlLabel, Switch, ToggleButton } from "@mui/material";
import _ from "lodash";
import { ReactElement, useCallback } from "react";
import { useTranslate } from "react-admin";
import { HslColor } from "react-colorful";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { Conftainer as BasicConftainer, DEFAULT_FONT_COLOUR } from "../../components/Common";
import Conftainer from "../../components/Conftainer";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import FontColour from "../../components/FontColour";
import { needsLatinFont } from "../../lib/funclib";
import FontSelector from "./FontSelector";
import { ContentConfigProps } from "./ReaderConfig";

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

export default function MainTextOverrideConfig({
  classes,
  readerConfig,
  actions,
  localClasses,
}: ContentConfigProps & { localClasses: ClassNameMap<string> }): ReactElement {
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  const id = readerConfig.id;
  const changeFontColour = useCallback(
    _.debounce((value: HslColor) => {
      dispatch(actions.setFontColour({ id, value }));
    }, 250),
    [],
  );

  const { fromLang, toLang } = useAppSelector((state) => state.userData.user);
  // // FIXME: this is copy/pasted from ReaderConfig.tsx
  // function fontColourSelectedChange(
  //   checked: boolean,
  //   stateSetter: (value: ContentConfigPayload<HslColor | null>) => void,
  // ) {
  //   // dispatch(stateSetter({ id, value: checked ? DEFAULT_FONT_COLOUR : null }));
  // }

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
          {!!readerConfig.fontColour && (
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
      </Conftainer>
    </>
  );
}
