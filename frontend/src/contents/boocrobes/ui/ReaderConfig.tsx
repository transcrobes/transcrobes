import * as React from "react";
import { ToggleButtonGroup, ToggleButton } from "@material-ui/lab";
import { Button, ButtonGroup, makeStyles, Switch } from "@material-ui/core";

import { HtmlNavigator, HtmlReaderState } from "../types";
import { USER_STATS_MODE } from "../../../lib/lib";
import { FormControl, FormControlLabel } from "@material-ui/core";
import Conftainer from "../../../components/Conftainer";
import { Conftainer as BasicConftainer, DEFAULT_FONT_COLOUR } from "../../../components/Common";
import FivePercentFineControl from "../../../components/FivePercentFineControl";
import FontColour from "../../../components/FontColour";

export type HtmlSettingsProps = {
  navigator: HtmlNavigator;
  readerState: HtmlReaderState;
};
const useStyles = makeStyles((theme) => ({
  [theme.breakpoints.up("sm")]: {
    buttonGroup: { padding: "0.3em", width: "100%" },
  },
  [theme.breakpoints.down("sm")]: {
    buttonGroup: { flexWrap: "wrap", padding: "0.3em", width: "100%" },
  },
  button: { width: "100%" },
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
  glossFontColour: { display: "flex", justifyContent: "flex-start", padding: "0.4em" },
}));

export default function ReaderConfig(props: HtmlSettingsProps): React.ReactElement {
  const { navigator, readerState } = props;
  const { fontFamily, fontFamilyChinese, isScrolling } = readerState;
  const { setFontFamilyChinese, setFontFamily, decreaseFontSize, increaseFontSize, setScroll } =
    navigator;
  const {
    setGlossing,
    setSegmentation,
    setMouseover,
    setGlossFontColour,
    setGlossFontSize,
    setGlossPosition,
  } = navigator;
  const { glossing, segmentation, mouseover, glossFontColour, glossFontSize, glossPosition } =
    readerState;
  const classes = useStyles();

  function handleGlossFontColourSelectedChange(
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ): void {
    setGlossFontColour(checked ? DEFAULT_FONT_COLOUR : null);
  }

  return (
    <>
      <Conftainer label="Paging" id="paging">
        <ToggleButtonGroup
          className={classes.button}
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) => setScroll(value)}
          value={isScrolling}
          exclusive
        >
          <ToggleButton className={classes.button} value={false}>
            Paginated
          </ToggleButton>
          <ToggleButton className={classes.button} value={true}>
            Scrolling
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Font family" id="ff">
        <FormControl component="fieldset" className={classes.fontSelection}>
          <FormControlLabel
            control={<Switch checked={fontFamily !== "Original"} />}
            label="Manual Font Selection"
            onChange={() => setFontFamily(fontFamily === "Original" ? "sans-serif" : "Original")}
          />
          {fontFamily !== "Original" && (
            <>
              <Conftainer label="English Font family" id="ffe">
                <ToggleButtonGroup
                  className={classes.buttonGroup}
                  value={fontFamily}
                  exclusive
                  onChange={(event: React.MouseEvent<HTMLElement>, value: any) =>
                    setFontFamily(value)
                  }
                >
                  <ToggleButton className={classes.button} value="sans-serif">
                    Sans-Serif
                  </ToggleButton>
                  <ToggleButton className={classes.button} value="serif">
                    Serif
                  </ToggleButton>
                  <ToggleButton className={classes.button} value="monospace">
                    Monospace
                  </ToggleButton>
                  <ToggleButton className={classes.button} value="opendyslexic">
                    Dyslexia-Friendly
                  </ToggleButton>
                </ToggleButtonGroup>
              </Conftainer>
              <Conftainer label="Chinese Font family" id="ffc">
                <ToggleButtonGroup
                  className={classes.buttonGroup}
                  value={fontFamilyChinese}
                  exclusive
                  onChange={(event: React.MouseEvent<HTMLElement>, value: any) =>
                    setFontFamilyChinese(value)
                  }
                >
                  <ToggleButton className={classes.button} value="notasanslight">
                    Nota Sans
                  </ToggleButton>
                  <ToggleButton className={classes.button} value="notaserifextralight">
                    Nota Serif light
                  </ToggleButton>
                  <ToggleButton className={classes.button} value="notaserifregular">
                    Nota Serif Normal
                  </ToggleButton>
                  <ToggleButton className={classes.button} value="mashanzheng">
                    Ma Shan Zheng
                  </ToggleButton>
                </ToggleButtonGroup>
              </Conftainer>
            </>
          )}
        </FormControl>
      </Conftainer>
      <Conftainer label="Font size" id="fs">
        <ButtonGroup className={classes.button}>
          <Button
            className={classes.button}
            aria-label="Decrease font size"
            onClick={decreaseFontSize}
          >
            A-
          </Button>
          <Button
            className={classes.button}
            aria-label="Increase font size"
            onClick={increaseFontSize}
          >
            A+
          </Button>
        </ButtonGroup>
      </Conftainer>
      <Conftainer label="Segmentation" id="segmentation">
        <ToggleButtonGroup
          className={classes.button}
          exclusive
          value={segmentation}
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            setSegmentation(value);
          }}
        >
          <ToggleButton className={classes.button} value={false}>
            None
          </ToggleButton>
          <ToggleButton className={classes.button} value={true}>
            Segmented
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Mouseover" id="mouseover">
        <ToggleButtonGroup
          className={classes.button}
          value={mouseover}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            setMouseover(value);
          }}
        >
          <ToggleButton className={classes.button} value={false}>
            None
          </ToggleButton>
          <ToggleButton className={classes.button} value={true}>
            Display Mouseover
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Glossing" id="glossing">
        <ToggleButtonGroup
          className={classes.buttonGroup}
          value={glossing}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) => setGlossing(value)}
        >
          <ToggleButton className={classes.button} value={USER_STATS_MODE.NO_GLOSS}>
            None
          </ToggleButton>
          <ToggleButton className={classes.button} value={USER_STATS_MODE.L2_SIMPLIFIED}>
            Simpler
          </ToggleButton>
          <ToggleButton className={classes.button} value={USER_STATS_MODE.TRANSLITERATION}>
            Sounds
          </ToggleButton>
          <ToggleButton className={classes.button} value={USER_STATS_MODE.L1}>
            English
          </ToggleButton>
          <ToggleButton className={classes.button} value={USER_STATS_MODE.TRANSLITERATION_L1}>
            Sounds + English
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label="Gloss Position" id="gp">
        <ToggleButtonGroup
          className={classes.buttonGroup}
          value={glossPosition}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) => setGlossPosition(value)}
        >
          <ToggleButton className={classes.button} value="row">
            After
          </ToggleButton>
          <ToggleButton className={classes.button} value="column-reverse">
            Above
          </ToggleButton>
          <ToggleButton className={classes.button} value="column">
            Below
          </ToggleButton>
          <ToggleButton className={classes.button} value="row-reverse">
            Before
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <BasicConftainer>
        <FivePercentFineControl
          label="Gloss Font Size"
          onValueChange={setGlossFontSize}
          value={glossFontSize}
          classes={classes}
        />
      </BasicConftainer>
      <FormControl component="fieldset" className={classes.glossFontColour}>
        <FormControlLabel
          control={
            <Switch checked={!!glossFontColour} onChange={handleGlossFontColourSelectedChange} />
          }
          label="Override gloss colour"
        />
        {!!glossFontColour && (
          <BasicConftainer>
            <FontColour
              value={glossFontColour}
              label="Gloss colour"
              classes={classes}
              onValueChange={setGlossFontColour}
            />
          </BasicConftainer>
        )}
      </FormControl>
    </>
  );
}
