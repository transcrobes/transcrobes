import { ClassNameMap, FormControl, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import _ from "lodash";
import React, { ReactElement, useCallback } from "react";
import { HslColor } from "react-colorful";
import { useAppDispatch } from "../../app/hooks";
import { Conftainer as BasicConftainer, DEFAULT_FONT_COLOUR } from "../../components/Common";
import Conftainer from "../../components/Conftainer";
import DictionaryChooser from "../../components/DictionaryChooser";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import FontColour from "../../components/FontColour";
import { bookReaderActions } from "../../features/content/bookReaderSlice";
import { ContentConfigPayload } from "../../features/content/contentSlice";
import { simpleReaderActions } from "../../features/content/simpleReaderSlice";
import { videoReaderActions } from "../../features/content/videoReaderSlice";
import { GlossPosition, ReaderState, USER_STATS_MODE } from "../../lib/types";
import GlossFontOverrideConfig from "./GlossFontOverrideConfig";
import MainTextOverrideConfig from "./MainTextOverrideConfig";
import { AnyAction } from "@reduxjs/toolkit";

export interface ContentConfigProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  classes: ClassNameMap<string>;
  actions: typeof simpleReaderActions | typeof videoReaderActions | typeof bookReaderActions;
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
        padding: "0.3em",
        width: "100%",
      },
      [theme.breakpoints.down("md")]: { flexWrap: "wrap" as const, padding: "0.3em", width: "100%" },
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
  const id = readerConfig.id;
  const { classes: localClasses } = useStyles();
  // function fontColourSelectedChange(
  //   checked: boolean,
  //   // stateSetter: (value: ContentConfigPayload<HslColor | null>) => void,
  //   stateSetter: AnyAction,
  // ) {
  //   dispatch(stateSetter({ id, value: checked ? DEFAULT_FONT_COLOUR : null }));
  //   throw new Error("not implemented");
  // }
  const changeGlossFontColour = useCallback(
    _.debounce((value: HslColor) => {
      dispatch(actions.setGlossFontColour({ id, value }));
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
      <Conftainer label="Glossing" id="glossing">
        <ToggleButtonGroup
          className={classes.buttonGroup || localClasses.buttonGroup}
          value={readerConfig.glossing}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: number) => {
            dispatch(actions.setGlossing({ id, value: value || USER_STATS_MODE.L1 }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.NO_GLOSS}>
            None
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.L2_SIMPLIFIED}>
            Simpler
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.TRANSLITERATION}>
            Sounds
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.L1}>
            English
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={USER_STATS_MODE.TRANSLITERATION_L1}>
            Sounds + English
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Gloss Position" id="gp">
        <ToggleButtonGroup
          className={classes.buttonGroup || localClasses.buttonGroup}
          value={readerConfig.glossPosition}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: GlossPosition) =>
            dispatch(actions.setGlossPosition({ id, value }))
          }
        >
          <ToggleButton className={classes.button || localClasses.button} value="row">
            After
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value="column-reverse">
            Above
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value="column">
            Below
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value="row-reverse">
            Before
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Gloss Font Size" id="glossFontSize">
        <FivePercentFineControl
          onValueChange={(value) => {
            dispatch(actions.setGlossFontSize({ id, value: value || 1 }));
          }}
          value={readerConfig.glossFontSize}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>
      <Conftainer label="Gloss Text Colour" id="ogc">
        <FormControl component="fieldset" className={classes.fontColour || localClasses.fontColour}>
          <FormControlLabel
            label="Override gloss colour"
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
      <Conftainer label="Segmentation" id="segmentation">
        <ToggleButtonGroup
          className={classes.button || localClasses.button}
          exclusive
          value={readerConfig.segmentation}
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setSegmentation({ id, value }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={false}>
            None
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={true}>
            Segmented
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Mouseover" id="mouseover">
        <ToggleButtonGroup
          className={classes.button || localClasses.button}
          value={readerConfig.mouseover}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setMouseover({ id, value }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={false}>
            None
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={true}>
            Display Mouseover
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>

      <Conftainer label="Collect recent phrases" id="collectRecents">
        <ToggleButtonGroup
          className={classes.button || localClasses.button}
          exclusive
          value={readerConfig.collectRecents}
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setCollectRecents({ id, value }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={false}>
            Off
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={true}>
            On
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>

      <Conftainer label="Strict Provider Ordering" id="strictProvider">
        <ToggleButtonGroup
          className={classes.button || localClasses.button}
          exclusive
          value={readerConfig.strictProviderOrdering}
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setStrictProviderOrdering({ id, value }));
          }}
        >
          <ToggleButton className={classes.button || localClasses.button} value={false}>
            Off
          </ToggleButton>
          <ToggleButton className={classes.button || localClasses.button} value={true}>
            On
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>

      <Conftainer label="Dictionary Providers" id="dictProviders">
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
