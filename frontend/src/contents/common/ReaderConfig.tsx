import { FormControl, FormControlLabel, makeStyles, Switch, Theme } from "@material-ui/core";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import _ from "lodash";
import React, { ReactElement, useCallback } from "react";
import { HslColor } from "react-colorful";
import { useAppDispatch } from "../../app/hooks";
import { Conftainer as BasicConftainer, DEFAULT_FONT_COLOUR } from "../../components/Common";
import Conftainer from "../../components/Conftainer";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import FontColour from "../../components/FontColour";
import { bookReaderActions } from "../../features/content/bookReaderSlice";
import { ContentConfigPayload } from "../../features/content/contentSlice";
import { simpleReaderActions } from "../../features/content/simpleReaderSlice";
import { videoReaderActions } from "../../features/content/videoReaderSlice";
import { FontFamily, FontFamilyChinese, GlossPosition, ReaderState, USER_STATS_MODE } from "../../lib/types";

export interface ContentConfigProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  classes: any;
  actions: typeof simpleReaderActions | typeof videoReaderActions | typeof bookReaderActions;
  readerConfig: ReaderState;
  allowMainTextOverride?: boolean;
}

const useStyles = makeStyles((theme: Theme) => ({
  fineControlIcons: {
    color: "#777",
    fontSize: 20,
    transform: "scale(0.9)",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
      transform: "scale(1)",
    },
  },
  fontSelection: { display: "flex", justifyContent: "flex-start", padding: "0.4em" },
  fontColour: { display: "flex", justifyContent: "flex-start", padding: "0.4em" },
  [theme.breakpoints.up("sm")]: {
    buttonGroup: { padding: "0.3em", width: "100%" },
  },
  [theme.breakpoints.down("sm")]: {
    buttonGroup: { flexWrap: "wrap", padding: "0.3em", width: "100%" },
  },
  button: { width: "100%" },
}));

export default function ContentConfig({
  classes,
  readerConfig,
  actions,
  allowMainTextOverride = true,
}: ContentConfigProps): ReactElement {
  const dispatch = useAppDispatch();
  const id = readerConfig.id;

  const localClasses = useStyles();
  function fontColourSelectedChange(
    checked: boolean,
    stateSetter: (value: ContentConfigPayload<HslColor | null>) => void,
  ) {
    dispatch(stateSetter({ id, value: checked ? DEFAULT_FONT_COLOUR : null }));
  }
  const changeFontColour = useCallback(
    _.throttle((value: HslColor) => {
      dispatch(actions.setFontColour({ id, value }));
    }, 500),
    [],
  );
  const changeGlossFontColour = useCallback(
    _.throttle((value: HslColor) => {
      dispatch(actions.setGlossFontColour({ id, value }));
    }, 500),
    [],
  );

  return (
    <>
      {allowMainTextOverride && (
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
                  <Conftainer label="English Font family" id="ffe">
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
                  <Conftainer label="Chinese Font family" id="ffc">
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
                    classes={classes}
                    onValueChange={changeFontColour}
                  />
                </BasicConftainer>
              )}
            </FormControl>
          </Conftainer>
        </>
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
            control={
              <Switch
                checked={!!readerConfig.glossFontColour}
                onChange={(event: React.ChangeEvent<HTMLInputElement>, checked: boolean) =>
                  fontColourSelectedChange(checked, actions.setGlossFontColour)
                }
              />
            }
            label="Override gloss colour"
          />
          {!!readerConfig.glossFontColour && (
            <BasicConftainer>
              <FontColour
                value={readerConfig.glossFontColour}
                label=""
                classes={classes}
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
    </>
  );
}
