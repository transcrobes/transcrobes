import { FormControl, FormControlLabel, Switch } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import _ from "lodash";
import { ReactElement, useCallback } from "react";
import { HslColor } from "react-colorful";
import { useAppDispatch } from "../../app/hooks";
import { Conftainer as BasicConftainer, DEFAULT_FONT_COLOUR } from "../../components/Common";
import Conftainer from "../../components/Conftainer";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import FontColour from "../../components/FontColour";
import { ContentConfigPayload } from "../../features/content/contentSlice";
import { FontFamily, FontFamilyChinese } from "../../lib/types";
import { ContentConfigProps } from "./ReaderConfig";

export default function MainTextOverrideConfig({
  classes,
  readerConfig,
  actions,
  localClasses,
}: ContentConfigProps & { localClasses: ClassNameMap<string> }): ReactElement {
  const dispatch = useAppDispatch();
  const id = readerConfig.id;
  const changeFontColour = useCallback(
    _.debounce((value: HslColor) => {
      dispatch(actions.setFontColour({ id, value }));
    }, 250),
    [],
  );
  // FIXME: this is copy/pasted from ReaderConfig.tsx
  function fontColourSelectedChange(
    checked: boolean,
    stateSetter: (value: ContentConfigPayload<HslColor | null>) => void,
  ) {
    dispatch(stateSetter({ id, value: checked ? DEFAULT_FONT_COLOUR : null }));
  }

  return (
    <>
      <Conftainer label="Font family" id="ff">
        <FormControl component="fieldset" className={classes.fontSelection || localClasses.fontSelection}>
          <FormControlLabel
            control={<Switch checked={readerConfig.fontFamily !== "Original"} />}
            label="Manual Font Selection"
            onChange={() =>
              dispatch(
                actions.setFontFamily({
                  id,
                  value: readerConfig.fontFamily === "Original" ? "sans-serif" : "Original",
                }),
              )
            }
          />
          {readerConfig.fontFamily !== "Original" && (
            <>
              <Conftainer label="Gloss Font family" id="ffe">
                <ToggleButtonGroup
                  className={classes.buttonGroup || localClasses.buttonGroup}
                  value={readerConfig.fontFamily}
                  exclusive
                  onChange={(event: React.MouseEvent<HTMLElement>, value: FontFamily) => {
                    dispatch(actions.setFontFamily({ id, value }));
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
                  <ToggleButton className={classes.button || localClasses.button} value="opendyslexic">
                    Dyslexia-Friendly
                  </ToggleButton>
                </ToggleButtonGroup>
              </Conftainer>
              <Conftainer label="Main text Font family" id="ffc">
                <ToggleButtonGroup
                  className={classes.buttonGroup || localClasses.buttonGroup}
                  value={readerConfig.fontFamilyChinese}
                  exclusive
                  onChange={(event: React.MouseEvent<HTMLElement>, value: FontFamilyChinese) => {
                    dispatch(actions.setFontFamilyChinese({ id, value }));
                  }}
                >
                  <ToggleButton className={classes.button || localClasses.button} value="notasanslight">
                    Nota Sans
                  </ToggleButton>
                  <ToggleButton className={classes.button || localClasses.button} value="notaserifextralight">
                    Nota Serif light
                  </ToggleButton>
                  <ToggleButton className={classes.button || localClasses.button} value="notaserifregular">
                    Nota Serif Normal
                  </ToggleButton>
                  <ToggleButton className={classes.button || localClasses.button} value="mashanzheng">
                    Ma Shan Zheng
                  </ToggleButton>
                </ToggleButtonGroup>
              </Conftainer>
            </>
          )}
        </FormControl>
      </Conftainer>
      <Conftainer label="Font Size" id="fontSize">
        <FivePercentFineControl
          onValueChange={(value) => dispatch(actions.setFontSize({ id, value: value || 1 }))}
          value={readerConfig.fontSize}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>
      <Conftainer label="Text Colour" id="otc">
        <FormControl component="fieldset" className={classes.fontColour || localClasses.fontColour}>
          <FormControlLabel
            control={
              <Switch
                checked={!!readerConfig.fontColour}
                onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                  fontColourSelectedChange(checked, actions.setFontColour)
                }
              />
            }
            label="Override text colour"
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
