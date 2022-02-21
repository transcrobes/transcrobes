import { FormControl, FormControlLabel, Switch } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import { ReactElement } from "react";
import { useAppDispatch } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import { FontFamily } from "../../lib/types";
import { ContentConfigProps } from "./ReaderConfig";

export default function GlossFontOverrideConfig({
  classes,
  readerConfig,
  actions,
  localClasses,
}: ContentConfigProps & { localClasses: ClassNameMap<string> }): ReactElement {
  const dispatch = useAppDispatch();
  const id = readerConfig.id;
  return (
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
              </ToggleButtonGroup>
            </Conftainer>
          </>
        )}
      </FormControl>
    </Conftainer>
  );
}
