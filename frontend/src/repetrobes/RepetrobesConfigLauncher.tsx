import React, { ReactElement } from "react";
import RepetrobesConfig from "./RepetrobesConfig";
import { RepetrobesActivityConfigType } from "../lib/types";
import SettingsIcon from "@material-ui/icons/Settings";
import { Box, Drawer, IconButton, makeStyles } from "@material-ui/core";

const useStyles = makeStyles({
  settings: {
    paddingTop: 0,
  },
});

interface Props {
  activityConfig: RepetrobesActivityConfigType;
  onConfigChange: (activityConfig: RepetrobesActivityConfigType) => void;
}

export default function RepetrobesConfigLauncher({ activityConfig, onConfigChange }: Props): ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const classes = useStyles();
  // TODO: work out how to do this as proper functions!
  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" || (event as React.KeyboardEvent).key === "Shift")
    ) {
      return;
    }
    setIsOpen(open);
  };

  return (
    <div>
      <IconButton className={classes.settings} onClick={toggleDrawer(true)} color="primary" aria-label="settings">
        <SettingsIcon />
      </IconButton>
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 300 }} role="presentation">
          <RepetrobesConfig activityConfig={activityConfig} onConfigChange={onConfigChange} />
        </Box>
      </Drawer>
    </div>
  );
}
