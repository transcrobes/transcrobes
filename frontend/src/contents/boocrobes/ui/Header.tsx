import React, { ComponentProps } from "react";
// import { Flex, Link, HStack, Text } from "@chakra-ui/react";
import { ActiveReader } from "../types";
// import useColorModeValue from "../ui/hooks/useColorModeValue";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";

import TableOfContents from "./TableOfContentsLauncher";
import useFullscreen from "./hooks/useFullScreen";
import { HEADER_HEIGHT } from "../constants";
import ReaderConfigLauncher from "./ReaderConfigLauncher";
import { Box, Grid, IconButton, Link, Typography } from "@material-ui/core";

import HomeIcon from "@material-ui/icons/Home";
import { CentredFlex } from "../../../repetrobes/Common";

export function HeaderLeft(): React.ReactElement {
  // const linkColor = useColorModeValue("gray.700", "gray.100", "gray.700");
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
        <TableOfContents navigator={navigator} manifest={manifest} />
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
        }}
      >
        {children}
      </Box>
    );
  },
);
