import { ClassNameMap, FormControl, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from "@mui/material";
import _ from "lodash";
import React, { ReactElement, useCallback } from "react";
import { useTranslate } from "react-admin";
import { HslColor } from "react-colorful";
import { makeStyles } from "tss-react/mui";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  Conftainer as BasicConftainer,
  DEFAULT_FONT_COLOUR,
  DEFAULT_GLOSS_BACKGROUND_COLOUR,
} from "../../components/Common";
import Conftainer from "../../components/Conftainer";
import DictionaryChooser from "../../components/DictionaryChooser";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import FontColour from "../../components/FontColour";
import { BookReaderActions } from "../../features/content/bookReaderSlice";
import { SimpleReaderActions } from "../../features/content/simpleReaderSlice";
import { VideoReaderActions } from "../../features/content/videoReaderSlice";
import { isScriptioContinuo } from "../../lib/funclib";
import { GlossPosition, ReaderState, USER_STATS_MODE } from "../../lib/types";
import GlossFontOverrideConfig from "./GlossFontOverrideConfig";
import MainTextOverrideConfig from "./MainTextOverrideConfig";

export interface ContentConfigProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  classes: ClassNameMap<string>;
  actions: SimpleReaderActions | VideoReaderActions | BookReaderActions;
  readerConfig: ReaderState;
  allowMainTextOverride?: boolean;
}

const useStyles = makeStyles()((theme) => {
  return {
    fineControlIcons: {
      color: "#777",
      fontSize: 20,
      transform: "scale(0.9)",
      "&:hover": {
        color: theme.palette.getContrastText(theme.palette.background.default),
        transform: "scale(1)",
      },
    },
    fontSelection: { display: "flex" as const, justifyContent: "flex-start", padding: "0.4em" },
    fontColour: { display: "flex" as const, justifyContent: "flex-start", padding: "0.4em" },
    buttonGroup: {
      [theme.breakpoints.up("sm")]: {
        width: "100%",
      },
      [theme.breakpoints.down("md")]: { flexWrap: "wrap" as const, width: "100%" },
    },
    button: { width: "100%" },
  };
});

export default function ContentConfig({
  classes,
  readerConfig,
  actions,
  allowMainTextOverride = true,
}: ContentConfigProps): ReactElement {
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  const id = readerConfig.id;
  const { classes: localClasses } = useStyles();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const changeGlossFontColour = useCallback(
    _.debounce((value: HslColor) => {
      dispatch(actions.setGlossFontColour({ id, value }));
    }, 250),
    [],
  );
  const changeGlossUnsureBackgroundColour = useCallback(
    _.debounce((value: HslColor) => {
      dispatch(actions.setGlossUnsureBackgroundColour({ id, value }));
    }, 250),
    [],
  );

  return (
    <div className={classes.configContainer}>
      {allowMainTextOverride ? (
        <MainTextOverrideConfig
          classes={classes}
          readerConfig={readerConfig}
          actions={actions}
          localClasses={localClasses}
        />
      ) : (
        <GlossFontOverrideConfig
          classes={classes}
          readerConfig={readerConfig}
          actions={actions}
          localClasses={localClasses}
        />
      )}
      <Conftainer label={translate("widgets.reader_config.glossing_type.title")} id="glossing">
        <ToggleButtonGroup
          className={classes.buttonGroup || localClasses.buttonGroup}
          value={readerConfig.glossing}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: number) => {
            dispatch(actions.setGlossing({ id, value: value || USER_STATS_MODE.L1 }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.NO_GLOSS}>
            {translate("widgets.reader_config.glossing_type.none")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.L2_SIMPLIFIED}>
            {translate("widgets.reader_config.glossing_type.simpler")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.TRANSLITERATION}>
            {translate("widgets.reader_config.glossing_type.sounds")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.L1}>
            {translate("widgets.reader_config.glossing_type.l1")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.TRANSLITERATION_L1}>
            {translate("widgets.reader_config.glossing_type.sounds_l1")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("widgets.reader_config.glossing_position.title")} id="gp">
        <ToggleButtonGroup
          className={classes.buttonGroup || localClasses.buttonGroup}
          value={readerConfig.glossPosition}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: GlossPosition) =>
            dispatch(actions.setGlossPosition({ id, value }))
          }
        >
          <ToggleButton className={classes.button || localClasses.button} value="row">
            {translate("widgets.reader_config.glossing_position.after")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value="column-reverse">
            {translate("widgets.reader_config.glossing_position.above")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value="column">
            {translate("widgets.reader_config.glossing_position.below")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value="row-reverse">
            {translate("widgets.reader_config.glossing_position.before")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("widgets.reader_config.gloss_font_size")} id="glossFontSize">
        <FivePercentFineControl
          onValueChange={(value) => {
            dispatch(actions.setGlossFontSize({ id, value: value || 1 }));
          }}
          value={readerConfig.glossFontSize}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>

      <Conftainer label={translate("widgets.reader_config.gloss_colour_title")} id="ogc">
        <FormControl component="fieldset" className={classes.fontColour || localClasses.fontColour}>
          <FormControlLabel
            label={translate("widgets.reader_config.gloss_colour_label")}
            control={
              <Switch
                checked={!!readerConfig.glossFontColour}
                onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                  dispatch(actions.setGlossFontColour({ id, value: checked ? DEFAULT_FONT_COLOUR : null }))
                }
              />
            }
          />
          {!!readerConfig.glossFontColour && (
            <BasicConftainer>
              <FontColour
                value={readerConfig.glossFontColour}
                label=""
                className={localClasses.fineControlIcons}
                onValueChange={changeGlossFontColour}
              />
            </BasicConftainer>
          )}
        </FormControl>
      </Conftainer>
      <Conftainer label={translate("widgets.reader_config.gloss_unsure_colour")} id="ougbc">
        <FormControl component="fieldset" className={classes.fontColour || localClasses.fontColour}>
          <FormControlLabel
            label={translate("widgets.reader_config.gloss_unsure_colour")}
            control={
              <Switch
                checked={!!readerConfig.glossUnsureBackgroundColour}
                onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                  dispatch(
                    actions.setGlossUnsureBackgroundColour({
                      id,
                      value: checked ? DEFAULT_GLOSS_BACKGROUND_COLOUR : null,
                    }),
                  )
                }
              />
            }
          />
          {!!readerConfig.glossUnsureBackgroundColour && (
            <BasicConftainer>
              <FontColour
                value={readerConfig.glossUnsureBackgroundColour}
                label=""
                className={localClasses.fineControlIcons}
                onValueChange={changeGlossUnsureBackgroundColour}
              />
            </BasicConftainer>
          )}
        </FormControl>
      </Conftainer>
      {isScriptioContinuo(fromLang) ? (
        <Conftainer label={translate("widgets.reader_config.segmentation.title")} id="segmentation">
          <ToggleButtonGroup
            className={classes.button || localClasses.button}
            exclusive
            value={readerConfig.segmentation}
            onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
              dispatch(actions.setSegmentation({ id, value }));
            }}
          >
            <ToggleButton className={classes.button || localClasses.button} value={false}>
              {translate("widgets.reader_config.segmentation.none")}
            </ToggleButton>
            <ToggleButton className={classes.button || localClasses.button} value={true}>
              {translate("widgets.reader_config.segmentation.segmented")}
            </ToggleButton>
          </ToggleButtonGroup>
        </Conftainer>
      ) : null}
      <Conftainer label={translate("widgets.reader_config.mouseover.title")} id="mouseover">
        <ToggleButtonGroup
          className={classes.button || localClasses.button}
          value={readerConfig.mouseover}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setMouseover({ id, value }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={false}>
            {translate("widgets.reader_config.mouseover.none")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={true}>
            {translate("widgets.reader_config.mouseover.display_mouseover")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      {readerConfig.mouseover ? (
        <Conftainer label={translate("widgets.reader_config.say_on_mouseover.title")} id="mouseover">
          <ToggleButtonGroup
            className={classes.button || localClasses.button}
            value={readerConfig.sayOnMouseover}
            exclusive
            onChange={(_: React.MouseEvent<HTMLElement>, value: boolean) => {
              dispatch(actions.setSayOnMouseover({ id, value }));
            }}
          >
            <ToggleButton className={classes.button || localClasses.button} value={false}>
              {translate("widgets.reader_config.say_on_mouseover.none")}
            </ToggleButton>
            <ToggleButton className={classes.button || localClasses.button} value={true}>
              {translate("widgets.reader_config.say_on_mouseover.say")}
            </ToggleButton>
          </ToggleButtonGroup>
        </Conftainer>
      ) : null}
      <Conftainer label={translate("widgets.reader_config.recent_phrases.title")} id="collectRecents">
        <ToggleButtonGroup
          className={classes.button || localClasses.button}
          exclusive
          value={readerConfig.collectRecents}
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setCollectRecents({ id, value }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={false}>
            {translate("widgets.reader_config.recent_phrases.off")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={true}>
            {translate("widgets.reader_config.recent_phrases.on")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("widgets.reader_config.strict_provider_ordering.title")} id="strictProvider">
        <ToggleButtonGroup
          className={classes.button || localClasses.button}
          exclusive
          value={readerConfig.strictProviderOrdering}
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setStrictProviderOrdering({ id, value }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={false}>
            {translate("widgets.reader_config.strict_provider_ordering.off")}
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={true}>
            {translate("widgets.reader_config.strict_provider_ordering.on")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("widgets.dictionary_provider.title")} id="dictProviders">
        <DictionaryChooser
          selected={readerConfig.translationProviderOrder}
          onSelectionChange={(value) => {
            dispatch(actions.setTranslationProviderOrder({ id, value }));
          }}
        />
      </Conftainer>
    </div>
  );
}
