import * as React from "react";
import { HtmlNavigator, HtmlReaderState } from "../types";
import { ToggleButtonGroup, ToggleButton } from "@material-ui/lab";
import { Button, ButtonGroup, makeStyles, styled } from "@material-ui/core";
import { USER_STATS_MODE } from "../../../lib/lib";

export type HtmlSettingsProps = {
  navigator: HtmlNavigator;
  readerState: HtmlReaderState;
  // paginationValue: string;
};
const useStyles = makeStyles((theme) => ({
  [theme.breakpoints.up("sm")]: {
    buttonGroup: { padding: "0.3em" },
  },
  [theme.breakpoints.down("sm")]: {
    buttonGroup: { flexWrap: "wrap", padding: "0.3em" },
  },
  button: { width: "100%" },
}));

export const Conftainer = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0.3em",
  width: "100%",
}));

export default function ReaderConfig(props: HtmlSettingsProps): React.ReactElement {
  // const { navigator, readerState, paginationValue } = props;
  const { navigator, readerState } = props;
  const { fontFamily, colorMode } = readerState;
  const { setFontFamily, decreaseFontSize, increaseFontSize, setColorMode, setScroll } = navigator;
  const { setGlossing, setSegmentation, setMouseover } = navigator;
  const { glossing, segmentation, mouseover } = readerState;
  const classes = useStyles();
  console.warn("and here is the readerSTate", readerState);
  return (
    <>
      <Conftainer>
        <ToggleButtonGroup
          className={classes.buttonGroup}
          value={fontFamily}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) => setFontFamily(value)}
        >
          <ToggleButton className={classes.button} value="publisher">
            Publisher
          </ToggleButton>
          <ToggleButton className={classes.button} value="serif">
            Serif
          </ToggleButton>
          <ToggleButton className={classes.button} value="sans-serif">
            Sans-Serif
          </ToggleButton>
          <ToggleButton className={classes.button} value="open-dyslexic">
            Dyslexia-Friendly
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer>
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
      <Conftainer>
        <ToggleButtonGroup
          className={classes.button}
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) => setScroll(value)}
          value={readerState.isScrolling}
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
      <Conftainer>
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
      <Conftainer>
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
      <Conftainer>
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
