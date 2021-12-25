// import { ThemeProvider, Flex, Icon } from "@chakra-ui/react";
// import { Flex } from "@chakra-ui/react";
import * as React from "react";
import KeyboardArrowLeftIcon from "@material-ui/icons/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@material-ui/icons/KeyboardArrowRight";

import { FOOTER_HEIGHT } from "../boocrobes/constants";
import { ReaderReturn } from "../boocrobes/types";

import Header from "../boocrobes/ui/Header";
// import useColorModeValue from "../boocrobes/ui/hooks/useColorModeValue";
// import { getTheme } from "../boocrobes/ui/theme";
import { Box, Container, IconButton } from "@material-ui/core";

/**
 * The default Manager UI. This will be broken into individual components
 * that can be imported and used separately or in a customized setup.
 * It takes the return value of useWebReader as props
 */
// const ManagerUI: React.FC<ReaderReturn> = (props) => {
//   return (
//     // <ThemeProvider theme={getTheme(props.state?.colorMode)}>
//     <WebReaderContent {...props} />
//     // </ThemeProvider>
//   );
// };

export const WebReaderContent: React.FC<ReaderReturn> = ({ children, ...props }) => {
  // const bgColor = useColorModeValue("ui.white", "ui.black", "ui.sepia");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isAtStart = props.state?.atStart;
  const isAtEnd = props.state?.atEnd;

  return (
    <Box display="flex" flexDirection="column" position={"relative"} height="calc(100% - 450px)">
      {!props.isLoading && <Header containerRef={containerRef} {...props} />}

      <Box
        // ref={containerRef}
        //flex={"1 1 auto"}
        flex={"1"}
        alignItems={"stretch"}
        display="flex"
        flexDirection="column"
        position={"relative"}
      >
        {children}
        {/* <Flex
          ref={containerRef}
          position="relative"
          // bg={bgColor}
          flexDir="column"
          alignItems="stretch"
          flex="1 1 auto"
        >
        </Flex> */}
      </Box>
      <Box
        component="footer"
        sx={{
          // zIndex: 1000,
          // py: 3,
          // px: 2,
          // mt: "auto",
          bottom: 0,
          width: "100%",
          borderTop: "1px solid",
          justifyContent: "space-between",
          position: "sticky",
          height: `${FOOTER_HEIGHT}px`,
        }}
      >
        <IconButton onClick={props.navigator?.goBackward} disabled={isAtStart}>
          <KeyboardArrowLeftIcon fontSize="large" /> Previous
        </IconButton>
        <IconButton onClick={props.navigator?.goForward} disabled={isAtEnd}>
          Next <KeyboardArrowRightIcon fontSize="large" />
        </IconButton>
      </Box>

      {/* <Flex
        as="footer"
        position="sticky"
        height={`${FOOTER_HEIGHT}px`}
        zIndex="base"
        bottom="0"
        justifyContent="space-between"
        w="100%"
        bg={bgColor}
        borderTop="1px solid"
        borderColor="gray.100"
      >
        <IconButton onClick={props.navigator?.goBackward} disabled={isAtStart}>
          <KeyboardArrowLeftIcon fontSize="large" /> Previous
        </IconButton>
        <IconButton onClick={props.navigator?.goForward} disabled={isAtEnd}>
          Next <KeyboardArrowRightIcon fontSize="large" />
        </IconButton>
      </Flex> */}
    </Box>
  );
};

export default WebReaderContent;
