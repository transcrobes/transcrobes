import { Box, Link } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";
import HomeIcon from "@material-ui/icons/Home";
import React from "react";
import { Button } from "react-admin";
import HelpButton from "../../components/HelpButton";
import useFullscreen from "../../hooks/useFullscreen";
import { HEADER_HEIGHT } from "../common/types";
import BookReaderLauncher from "./BookReaderConfigLauncher";
import TableOfContentsLauncher from "./TableOfContentsLauncher";
import { WebpubManifest } from "./WebpubManifestTypes/WebpubManifest";

interface Props {
  manifest: WebpubManifest;
}

export default function Header({ manifest }: Props): React.ReactElement {
  const [isFullscreen, toggleFullscreen] = useFullscreen();
  const theme = useTheme();
  const helpUrl = "https://transcrob.es/page/software/learn/boocrobes/";
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
        <TableOfContentsLauncher manifest={manifest} />
        <BookReaderLauncher />
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
