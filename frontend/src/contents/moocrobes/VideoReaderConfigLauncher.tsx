import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Drawer } from "@mui/material";
import { ReactElement, useState } from "react";
import { Button, useTranslate } from "react-admin";
import useWindowDimensions from "../../hooks/WindowDimensions";
import VideoReaderConfig, { VideoReaderConfigProps } from "./VideoReaderConfig";

export default function VideoReaderConfigLauncher({
  id,
  containerRef,
  onSubDelayChange,
}: VideoReaderConfigProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const dimensions = useWindowDimensions();
  const width = dimensions.width < 600 ? dimensions.width * 0.8 : "inherit";
  const translate = useTranslate();

  function handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    setAnchorEl(event.currentTarget as HTMLElement);
  }
  function handleClose(): void {
    setAnchorEl(null);
  }
  return (
    <>
      <Button
        size="large"
        children={<SettingsIcon />}
        label={translate("screens.moocrobes.config.title")}
        onClick={handleClick}
      />
      <Drawer container={containerRef?.current} anchor="left" open={open} onClose={handleClose}>
        <Box sx={{ width: width }} role="presentation">
          <VideoReaderConfig id={id} containerRef={containerRef} onSubDelayChange={onSubDelayChange} />
        </Box>
      </Drawer>
    </>
  );
}
