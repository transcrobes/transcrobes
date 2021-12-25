import { FC } from "react";
import { UseWebReaderArguments } from "../boocrobes/types";
import useWebReader from "../boocrobes/useWebReader";
import React from "react";
import { Box, createStyles, IconButton, makeStyles, Theme } from "@material-ui/core";
import Header from "../boocrobes/ui/Header";
import { FOOTER_HEIGHT } from "../boocrobes/constants";
import KeyboardArrowLeftIcon from "@material-ui/icons/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@material-ui/icons/KeyboardArrowRight";

export type WebReaderProps = UseWebReaderArguments;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    buttons: {
      padding: 0,
    },
  }),
);

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
