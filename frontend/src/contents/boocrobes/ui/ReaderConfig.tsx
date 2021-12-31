import * as React from "react";
import { ToggleButtonGroup, ToggleButton } from "@material-ui/lab";
import { Button, ButtonGroup, makeStyles, Switch } from "@material-ui/core";

import { HtmlNavigator, HtmlReaderState } from "../types";
import { USER_STATS_MODE } from "../../../lib/lib";
// import { Conftainer } from "../../../components/Common";
import { FormControl, FormControlLabel } from "@material-ui/core";
import { ReactElement } from "react";
import Conftainer from "../../../components/Conftainer";

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
  conftainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0.3em",
    width: "100%",
  },
}));

type Props = {
  title: string;
  children?: React.ReactNode;
};
function Conftainerold({ title, children }: Props): ReactElement {
  const classes = useStyles();
  return (
    <FormControl component="fieldset">
      <FormControlLabel
        control={<div className={classes.conftainer}>{children}</div>}
        label={title}
      />
    </FormControl>
  );
}

export default function ReaderConfig(props: HtmlSettingsProps): React.ReactElement {
  const { navigator, readerState } = props;
  const { fontFamily, fontFamilyChinese, isScrolling } = readerState;
  const { setFontFamilyChinese, setFontFamily, decreaseFontSize, increaseFontSize, setScroll } =
    navigator;
  const { setGlossing, setSegmentation, setMouseover } = navigator;
  const { glossing, segmentation, mouseover } = readerState;
  const classes = useStyles();
  return (
    <>
      <Conftainer label="Font family" id="ff">
        <FormControl component="fieldset" className={classes.wordSelection}>
          <FormControlLabel
            control={<Switch checked={fontFamily !== "publisher"} />}
            label="Manual Font Selection"
            onChange={() => setFontFamily(fontFamily === "publisher" ? "sans-serif" : "publisher")}
          />
          {fontFamily !== "publisher" && (
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
                  <ToggleButton className={classes.button} value="open-dyslexic">
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
    </>
  );
}
