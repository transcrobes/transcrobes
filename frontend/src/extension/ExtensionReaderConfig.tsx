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
import { setAndSaveUser } from "../features/user/userSlice";
import { CornerPosition, ThemeName } from "../lib/types";

export default function ExtensionConfig(): ReactElement {
  const id = EXTENSION_READER_ID;

  const readerConfig = useAppSelector(
    (state) => state.extensionReader[id] || { ...DEFAULT_EXTENSION_READER_CONFIG_STATE },
  );
  const user = useAppSelector((state) => state.userData);
  const dispatch = useAppDispatch();
  const actions = extensionReaderActions;
  return (
    <div>
      <Conftainer label="Popup theme mode" id="themeMode">
        <ToggleButtonGroup
          sx={{ width: "100%" }}
          exclusive
          value={readerConfig.themeName}
          onChange={(_e: React.MouseEvent<HTMLElement>, value: ThemeName) => {
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
      <Conftainer label="Page analysis" id="pageAnalysis">
        <ToggleButtonGroup
          sx={{ width: "100%" }}
          exclusive
          value={readerConfig.analysisPosition}
          onChange={(_e: React.MouseEvent<HTMLElement>, value: CornerPosition) => {
            dispatch(actions.setAnalysisPosition({ id, value }));
          }}
        >
          <ToggleButton sx={{ width: "100%" }} value={"none"}>
            Off
          </ToggleButton>
          <ToggleButton sx={{ width: "100%" }} value={"top-right"}>
            Top Right
          </ToggleButton>
          <ToggleButton sx={{ width: "100%" }} value={"bottom-right"}>
            Bottom Right
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Show Suggestions?" id="oss">
        <FormControl component="fieldset" sx={{ display: "flex", justifyContent: "flex-start", padding: "0.4em" }}>
          <FormControlLabel
            label="Show Suggestions?"
            control={
              <Switch
                checked={!!readerConfig.showSuggestions}
                onChange={(_e: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                  dispatch(actions.setShowSuggestions({ id, value: checked }))
                }
              />
            }
          />
        </FormControl>
      </Conftainer>
      {user.user.isAdmin && (
        <Conftainer label="Show Research Details?" id="oss">
          <FormControl component="fieldset" sx={{ display: "flex", justifyContent: "flex-start", padding: "0.4em" }}>
            <FormControlLabel
              label="Show Research Details?"
              control={
                <Switch
                  checked={!!user.showResearchDetails}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                    dispatch(setAndSaveUser({ ...user, showResearchDetails: checked }))
                  }
                />
              }
            />
          </FormControl>
        </Conftainer>
      )}
      <ReaderConfig classes={{}} actions={actions} readerConfig={readerConfig} allowMainTextOverride={false} />
    </div>
  );
}
