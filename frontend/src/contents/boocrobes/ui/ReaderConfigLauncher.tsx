import React, { ReactElement } from "react";
// import { RepetrobesActivityConfigType } from "../lib/types";
import SettingsIcon from "@material-ui/icons/Settings";
import { Box, createStyles, Drawer, IconButton, makeStyles, Theme } from "@material-ui/core";
import { HTMLActiveReader } from "../types";
import ReaderConfig from "./ReaderConfig";
import useWindowDimensions from "../../../hooks/WindowDimensions";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    settings: {},
  }),
);

type Props = Pick<HTMLActiveReader, "navigator" | "state" | "type">;

export default function ReaderConfigLauncher(props: Props): ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const classes = useStyles();

  // const paginationValue = props.state?.isScrolling ? "scrolling" : "paginated";

  // TODO: work out how to do this as proper functions!
  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" ||
        (event as React.KeyboardEvent).key === "Shift")
    ) {
      return;
    }
    setIsOpen(open);
  };

  const dimensions = useWindowDimensions();
  const width = dimensions.width < 600 ? dimensions.width * 0.8 : "inherit";
  return (
    <div>
      <IconButton
        className={classes.settings}
        onClick={toggleDrawer(true)}
        color="primary"
        aria-label="settings"
      >
        <SettingsIcon />
      </IconButton>
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: width }} role="presentation">
          <ReaderConfig
            navigator={props.navigator}
            readerState={props.state}
            // paginationValue={paginationValue}
          />
        </Box>
      </Drawer>
    </div>
  );
}
