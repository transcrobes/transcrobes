import React, { ComponentProps } from "react";
import { ActiveReader } from "../types";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";

import TableOfContentsLauncher from "./TableOfContentsLauncher";
import useFullscreen from "./hooks/useFullScreen";
import { HEADER_HEIGHT } from "../constants";
import ReaderConfigLauncher from "./ReaderConfigLauncher";
import { Box, IconButton, Link } from "@material-ui/core";

import HomeIcon from "@material-ui/icons/Home";

export function HeaderLeft(): React.ReactElement {
  return (
    <Box display="flex">
      <Link href="/#/contents" aria-label="Return to Content">
        <IconButton title="Return to Content">
          <HomeIcon /> Back to Content
        </IconButton>
      </Link>
    </Box>
  );
}

export default function Header(
  props: ActiveReader & {
    containerRef: React.MutableRefObject<null | HTMLDivElement>;
  },
): React.ReactElement {
  const [isFullscreen, toggleFullScreen] = useFullscreen();
  const { navigator, manifest, containerRef } = props;
  return (
    <HeaderWrapper>
      <HeaderLeft />
      <Box display="flex">
        <TableOfContentsLauncher navigator={navigator} manifest={manifest} />
        <ReaderConfigLauncher {...props} />

        <IconButton onClick={toggleFullScreen}>
          {isFullscreen ? <FullscreenExit fontSize="large" /> : <Fullscreen fontSize="large" />}
        </IconButton>
      </Box>
    </HeaderWrapper>
  );
}

export const HeaderWrapper = React.forwardRef<HTMLDivElement, ComponentProps<typeof Box>>(
  ({ children, ...rest }, ref) => {
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
          bgcolor: "#faf4e8",
        }}
      >
        {children}
      </Box>
    );
  },
);
