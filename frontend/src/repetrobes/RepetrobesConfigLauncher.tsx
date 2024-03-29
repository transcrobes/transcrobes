import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Drawer } from "@mui/material";
import React, { ReactElement } from "react";
import { Button, useTranslate } from "react-admin";
import { RepetrobesActivityConfigType } from "../lib/types";
import RepetrobesConfig from "./RepetrobesConfig";

interface Props {
  activityConfig: RepetrobesActivityConfigType;
  onConfigChange: (activityConfig: RepetrobesActivityConfigType) => void;
}

export default function RepetrobesConfigLauncher({ activityConfig, onConfigChange }: Props): ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const translate = useTranslate();
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
    <Box>
      <Button
        size="large"
        children={<SettingsIcon />}
        label={translate("screens.repetrobes.config.title")}
        onClick={toggleDrawer(true)}
      />
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 300 }} role="presentation">
          <RepetrobesConfig activityConfig={activityConfig} onConfigChange={onConfigChange} />
        </Box>
      </Drawer>
    </Box>
  );
}
