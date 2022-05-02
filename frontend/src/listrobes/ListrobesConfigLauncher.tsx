import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Drawer, IconButton } from "@mui/material";
import { Theme } from "@mui/material/styles";
import React, { ReactElement } from "react";
import { makeStyles } from "tss-react/mui";
import { GraderConfig } from "../lib/types";
import { ListrobesConfig } from "./ListrobesConfig";

const useStyles = makeStyles()((theme: Theme) => ({
  typography: {
    padding: theme.spacing(2),
  },
  settings: {
    paddingTop: 0,
  },
}));

interface Props {
  graderConfig: GraderConfig;
  onConfigChange: (graderConfig: GraderConfig) => void;
}

export default function ListrobesConfigLauncher({ graderConfig, onConfigChange }: Props): ReactElement {
  const { classes } = useStyles();
  const [isOpen, setIsOpen] = React.useState(false);

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
      <IconButton
        className={classes.settings}
        onClick={toggleDrawer(true)}
        color="primary"
        aria-label="settings"
        size="large"
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
