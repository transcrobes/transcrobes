import React from "react";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";
import { Box, Link } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import HomeIcon from "@material-ui/icons/Home";
import { Button } from "react-admin";

import { ActiveReader } from "../types";
import TableOfContentsLauncher from "./TableOfContentsLauncher";
import useFullscreen from "../../../hooks/useFullscreen";
import { HEADER_HEIGHT } from "../constants";
import ReaderConfigLauncher from "./ReaderConfigLauncher";

export default function Header(props: ActiveReader): React.ReactElement {
  const [isFullscreen, toggleFullscreen] = useFullscreen();
  const { navigator, manifest } = props;
  const theme = useTheme();
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        zIndex: 1000,
        top: "0px",
        width: "100%",
        borderTop: "1px solid",
        alignContent: "space-between",
        justifyContent: "space-between",
        position: "sticky",
        height: `${HEADER_HEIGHT}px`,
        color: theme.palette.getContrastText(theme.palette.background.default),
        bgcolor: theme.palette.background.default,
      }}
    >
      <Box display="flex">
        <Link href="/#/contents" aria-label="Back to Content">
          <Button size="large" children={<HomeIcon />} label="Back to Content" />
        </Link>
      </Box>

      <Box display="flex">
        <TableOfContentsLauncher navigator={navigator} manifest={manifest} />
        <ReaderConfigLauncher {...props} />
        <Button
          size="large"
          children={isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          label="Fullscreen"
          onClick={() => toggleFullscreen()}
        />
      </Box>
    </Box>
  );
}
