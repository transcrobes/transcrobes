import { FC } from "react";
import KeyboardArrowLeftIcon from "@material-ui/icons/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@material-ui/icons/KeyboardArrowRight";
import { Button } from "react-admin";
import { useSelector } from "react-redux";

import useWebReader from "../useWebReader";
import { Box, useTheme } from "@material-ui/core";
import Header from "./Header";
import { FOOTER_HEIGHT } from "../constants";
import { AppState } from "../../../lib/types";
import { UseWebReaderArguments } from "../types";

const WebReader: FC<UseWebReaderArguments> = ({ webpubManifestUrl, getContent, ...props }) => {
  const webReader = useWebReader({
    webpubManifestUrl,
    getContent,
    ...props,
  });
  const { content } = webReader;

  const isAtStart = webReader.state?.atStart;
  const isAtEnd = webReader.state?.atEnd;

  const theme = useTheme();
  const themeName = useSelector((state: AppState) => state.theme);
  return (
    <Box>
      {!webReader.isLoading && <Header {...webReader} />}

      <Box
        flex={"1"}
        alignItems={"stretch"}
        display="flex"
        flexDirection="column"
        position={"relative"}
        sx={{
          // color: theme.palette.getContrastText(theme.palette.background.default),
          // FIXME: this should be declared somewhere less nasty
          bgcolor: themeName === "dark" ? "#000000" : "#fff",
        }}
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
          color: theme.palette.getContrastText(theme.palette.background.default),
          bgcolor: theme.palette.background.default,
        }}
      >
        <Button
          size="large"
          children={<KeyboardArrowLeftIcon />}
          label="Previous"
          onClick={webReader.navigator?.goBackward}
          disabled={isAtStart}
        />
        <Button
          alignIcon="right"
          size="large"
          children={<KeyboardArrowRightIcon />}
          label="Next"
          onClick={webReader.navigator?.goForward}
          disabled={isAtEnd}
        />
      </Box>
    </Box>
  );
};

export default WebReader;
