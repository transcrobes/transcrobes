import React, { ReactElement } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Drawer } from "@mui/material";
import BookReaderConfig from "./BookReaderConfig";
import useWindowDimensions from "../../hooks/WindowDimensions";
import { Button } from "react-admin";

export default function BookReaderConfigLauncher(): ReactElement {
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

  const dimensions = useWindowDimensions();
  const width = dimensions.width < 600 ? dimensions.width * 0.8 : "inherit";
  return (
    <>
      <Button
        size="large"
        children={<SettingsIcon />}
        label="Settings"
        onClick={toggleDrawer(true)}
      />
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width }} role="presentation">
          <BookReaderConfig />
        </Box>
      </Drawer>
    </>
  );
}
