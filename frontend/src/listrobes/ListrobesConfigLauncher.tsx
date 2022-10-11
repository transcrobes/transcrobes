import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Drawer } from "@mui/material";
import React, { ReactElement } from "react";
import { Button, useTranslate } from "react-admin";
import { GraderConfig } from "../lib/types";
import { ListrobesConfig } from "./ListrobesConfig";

interface Props {
  graderConfig: GraderConfig;
  onConfigChange: (graderConfig: GraderConfig) => void;
}

export default function ListrobesConfigLauncher({ graderConfig, onConfigChange }: Props): ReactElement {
  const translate = useTranslate();
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
      <Button
        size="large"
        children={<SettingsIcon />}
        label={translate("screens.listrobes.config.title")}
        onClick={toggleDrawer(true)}
      />
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 300 }} role="presentation">
          <ListrobesConfig graderConfig={graderConfig} onConfigChange={onConfigChange} />
        </Box>
      </Drawer>
    </div>
  );
}
