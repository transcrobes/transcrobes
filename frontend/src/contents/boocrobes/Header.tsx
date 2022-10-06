import Fullscreen from "@mui/icons-material/Fullscreen";
import FullscreenExit from "@mui/icons-material/FullscreenExit";
import HomeIcon from "@mui/icons-material/Home";
import { Box, Link } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { Button } from "react-admin";
import HelpButton from "../../components/HelpButton";
import WatchDemo from "../../components/WatchDemo";
import useFullscreen from "../../hooks/useFullscreen";
import { BOOCROBES_HEADER_HEIGHT, BOOCROBES_YT_VIDEO, DOCS_DOMAIN } from "../../lib/types";
import { WebpubManifest } from "../../lib/WebpubManifestTypes/WebpubManifest";
import BookReaderLauncher from "./BookReaderConfigLauncher";
import TableOfContentsLauncher from "./TableOfContentsLauncher";

interface Props {
  manifest: WebpubManifest;
}

export default function Header({ manifest }: Props): React.ReactElement {
  const [isFullscreen, toggleFullscreen] = useFullscreen();
  const theme = useTheme();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/boocrobes/`;
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
        height: `${BOOCROBES_HEADER_HEIGHT}px`,
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
        <TableOfContentsLauncher manifest={manifest} />
        <BookReaderLauncher />
        <WatchDemo url={BOOCROBES_YT_VIDEO} size="large" />
        <HelpButton url={helpUrl} size="large" />
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
