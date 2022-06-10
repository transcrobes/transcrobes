import { FormControl, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from "@mui/material";
import React, { ReactElement } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import Conftainer from "../components/Conftainer";
import ReaderConfig from "../contents/common/ReaderConfig";
import {
  DEFAULT_EXTENSION_READER_CONFIG_STATE,
  extensionReaderActions,
  EXTENSION_READER_ID,
} from "../features/content/extensionReaderSlice";
import { changeTheme } from "../features/themes/themeReducer";
import { ThemeName } from "../lib/types";

export default function ExtensionConfig(): ReactElement {
  const id = EXTENSION_READER_ID;

  const readerConfig = useAppSelector(
    (state) => state.extensionReader[id] || { ...DEFAULT_EXTENSION_READER_CONFIG_STATE },
  );
  const dispatch = useAppDispatch();
  const actions = extensionReaderActions;
  return (
    <div>
      <Conftainer label="Show Suggestions?" id="oss">
        <FormControl component="fieldset" sx={{ display: "flex", justifyContent: "flex-start", padding: "0.4em" }}>
          <FormControlLabel
            label="Show Suggestions?"
            control={
              <Switch
                checked={!!readerConfig.showSuggestions}
                onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                  dispatch(actions.setShowSuggestions({ id, value: checked }))
                }
              />
            }
          />
        </FormControl>
      </Conftainer>
      <Conftainer label="Theme mode" id="themeMode">
        <ToggleButtonGroup
          sx={{ width: "100%" }}
          exclusive
          value={readerConfig.themeName}
          onChange={(event: React.MouseEvent<HTMLElement>, value: ThemeName) => {
            dispatch(changeTheme(value));
            dispatch(actions.setThemeName({ id, value }));
          }}
        >
          <ToggleButton sx={{ width: "100%" }} value={"light"}>
            Light Mode
          </ToggleButton>
          <ToggleButton sx={{ width: "100%" }} value={"dark"}>
            Dark Mode
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <ReaderConfig classes={{}} actions={actions} readerConfig={readerConfig} allowMainTextOverride={false} />
    </div>
  );
}
