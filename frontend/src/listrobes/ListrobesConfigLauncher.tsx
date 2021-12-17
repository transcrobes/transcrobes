import React, { ReactElement } from "react";
import { makeStyles, createStyles, Theme } from "@material-ui/core/styles";

import SettingsIcon from "@material-ui/icons/Settings";
import { Box, Drawer, IconButton } from "@material-ui/core";
import { ListrobesConfig } from "./ListrobesConfig";
import { GraderConfig } from "../lib/types";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    typography: {
      padding: theme.spacing(2),
    },
    settings: {
      paddingTop: 0,
    },
  }),
);

interface Props {
  loading: boolean;
  graderConfig: GraderConfig;
  onConfigChange: (graderConfig: GraderConfig) => void;
}

export default function ListrobesConfigLauncher({
  graderConfig,
  onConfigChange,
}: Props): ReactElement {
  const classes = useStyles();
  const [isOpen, setIsOpen] = React.useState(false);

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
        <Box sx={{ width: 300 }} role="presentation">
          <ListrobesConfig graderConfig={graderConfig} onConfigChange={onConfigChange} />
        </Box>
      </Drawer>
    </div>
  );
}
