import { FC } from "react";
import { UseWebReaderArguments } from "../boocrobes/types";
import useWebReader from "../boocrobes/useWebReader";
import React from "react";
import { Box, createStyles, IconButton, makeStyles, Theme } from "@material-ui/core";
import Header from "../boocrobes/ui/Header";
import { FOOTER_HEIGHT } from "../boocrobes/constants";
import KeyboardArrowLeftIcon from "@material-ui/icons/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@material-ui/icons/KeyboardArrowRight";
import Reader from "./Reader";

export type WebReaderProps = UseWebReaderArguments;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    buttons: {
      padding: 0,
    },
  }),
);

// From Reader.css
// [data-viewer-theme="day"] {
//   background-color: #fff; }

// [data-viewer-theme="sepia"] {
//   background-color: #faf4e8; }
//   [data-viewer-theme="sepia"] button {
//     background: #faf4e8;
//     color: #5B5852; }
//   [data-viewer-theme="sepia"] a {
//     color: #5B5852; }
//   [data-viewer-theme="sepia"] .info {
//     color: #5B5852; }

// [data-viewer-theme="night"] {
//   background-color: #000000;
//   color: #fff; }
//   [data-viewer-theme="night"] button {
//     background: #000000;
//     color: #DADADA; }
//   [data-viewer-theme="night"] a {
//     color: #DADADA; }
//   [data-viewer-theme="night"] .info {
//     color: #DADADA; }

const WebReader: FC<WebReaderProps> = ({ webpubManifestUrl, getContent, ...props }) => {
  const classes = useStyles();
  const webReader = useWebReader({
    webpubManifestUrl,
    getContent,
    ...props,
  });
  const { content } = webReader;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const isAtStart = webReader.state?.atStart;
  const isAtEnd = webReader.state?.atEnd;

  return (
    <Box>
      {!webReader.isLoading && <Header containerRef={containerRef} {...webReader} />}

      <Box
        flex={"1"}
        alignItems={"stretch"}
        display="flex"
        flexDirection="column"
        position={"relative"}
      >
        {content}
      </Box>
      <Box
        component="footer"
        display="flex"
        sx={{
          bottom: 0,
          width: "100%",
          borderTop: "1px solid",
          justifyContent: "space-between",
          position: "sticky",
          height: `${FOOTER_HEIGHT}px`,
          bgcolor: "#faf4e8",
        }}
      >
        <IconButton
          className={classes.buttons}
          onClick={webReader.navigator?.goBackward}
          disabled={isAtStart}
        >
          <KeyboardArrowLeftIcon fontSize="large" /> Previous
        </IconButton>
        <IconButton
          className={classes.buttons}
          onClick={webReader.navigator?.goForward}
          disabled={isAtEnd}
        >
          Next <KeyboardArrowRightIcon fontSize="large" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default WebReader;
