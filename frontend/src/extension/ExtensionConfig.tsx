import { FormControl, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from "@mui/material";
import React, { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import Conftainer from "../components/Conftainer";
import ReaderConfig from "../contents/common/ContentConfig";
import { extensionReaderActions as actions } from "../features/content/extensionReaderSlice";
import { changeTheme } from "../features/themes/themeReducer";
import { setAndSaveUser } from "../features/user/userSlice";
import {
  CornerPosition,
  DEFAULT_EXTENSION_READER_CONFIG_STATE,
  EXTENSION_READER_ID,
  ThemeName,
  translationProviderOrder,
} from "../lib/types";
import { getDefaultLanguageDictionaries } from "../lib/libMethods";

export default function ExtensionConfig(): ReactElement {
  const id = EXTENSION_READER_ID;

  const user = useAppSelector((state) => state.userData);
  const readerConfig = useAppSelector(
    (state) =>
      state.extensionReader[id] || {
        ...DEFAULT_EXTENSION_READER_CONFIG_STATE,
        translationProviderOrder: translationProviderOrder(getDefaultLanguageDictionaries(user.user.fromLang)),
      },
  );
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  return (
    <div>
      <Conftainer label={translate("screens.extension.popup_theme_mode.title")} id="themeMode">
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
            {translate("screens.extension.popup_theme_mode.light_mode")}
          </ToggleButton>
          <ToggleButton sx={{ width: "100%" }} value={"dark"}>
            {translate("screens.extension.popup_theme_mode.dark_mode")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("screens.extension.page_analysis.title")} id="pageAnalysis">
        <ToggleButtonGroup
          sx={{ width: "100%" }}
          exclusive
          value={readerConfig.analysisPosition}
          onChange={(_e: React.MouseEvent<HTMLElement>, value: CornerPosition) => {
            dispatch(actions.setAnalysisPosition({ id, value }));
          }}
        >
          <ToggleButton sx={{ width: "100%" }} value={"none"}>
            {translate("screens.extension.page_analysis.off")}
          </ToggleButton>
          <ToggleButton sx={{ width: "100%" }} value={"top-right"}>
            {translate("screens.extension.page_analysis.top_right")}
          </ToggleButton>
          <ToggleButton sx={{ width: "100%" }} value={"bottom-right"}>
            {translate("screens.extension.page_analysis.bottom_right")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("screens.extension.show_suggestions")} id="oss">
        <FormControl component="fieldset" sx={{ display: "flex", justifyContent: "flex-start", padding: "0.4em" }}>
          <FormControlLabel
            label={translate("screens.extension.show_suggestions")}
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
        <Conftainer label={translate("screens.extension.show_research_details")} id="oss">
          <FormControl component="fieldset" sx={{ display: "flex", justifyContent: "flex-start", padding: "0.4em" }}>
            <FormControlLabel
              label={translate("screens.extension.show_research_details")}
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
