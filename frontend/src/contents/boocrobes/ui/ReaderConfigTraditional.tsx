import * as React from "react";
import { ToggleButtonGroup, ToggleButton } from "@material-ui/lab";
import { Button, ButtonGroup, makeStyles } from "@material-ui/core";

import { HtmlNavigator, HtmlReaderState } from "../types";
import { USER_STATS_MODE } from "../../../lib/lib";
import { FormControl, FormControlLabel } from "@material-ui/core";
import { ReactElement } from "react";
import Conftainer from "../../../components/Conftainer";
import GlossingSelector from "../../../components/GlossingSelector";
import FontSelector from "./FontSelector";

export type HtmlSettingsProps = {
  navigator: HtmlNavigator;
  readerState: HtmlReaderState;
};
const useStyles = makeStyles((theme) => ({
  [theme.breakpoints.up("sm")]: {
    buttonGroup: { padding: "0.3em" },
  },
  [theme.breakpoints.down("sm")]: {
    buttonGroup: { flexWrap: "wrap", padding: "0.3em" },
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
  const { fontFamily, isScrolling } = readerState;
  const { setFontFamily, decreaseFontSize, increaseFontSize, setScroll } = navigator;
  const { setGlossing, setSegmentation, setMouseover } = navigator;
  const { glossing, segmentation, mouseover } = readerState;
  const classes = useStyles();
  return (
    <>
      <Conftainer label="Font family" id="ff">
        <FontSelector
          className={classes.buttonGroup}
          value={fontFamily}
          onChange={(value) => setFontFamily(value)}
        />
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
        <GlossingSelector
          className={classes.buttonGroup}
          value={glossing}
          onChange={(value) => setGlossing(value)}
        />
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
