import { Box, Divider } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import useResizeObserver from "use-resize-observer";
import { useAppSelector } from "../../../app/hooks";
import { getDefinitions, positionPopup } from "../../../lib/componentMethods";
import { originalSentenceFromTokens } from "../../../lib/funclib";
import { bestGuess } from "../../../lib/libMethods";
import { platformHelper } from "../../../lib/proxies";
import { ExtensionReaderState, IS_EXT, PopupPosition, ReaderState } from "../../../lib/types";
import ReaderConfigProvider from "../../ReaderConfigProvider";
import Container from "./Container";
import Extras from "./Extras";
import Header from "./Header";
import { FullSpecDocument, isFullscreened } from "../../../hooks/useFullscreen";

export type Props = {
  readerConfig: ReaderState;
};

export interface StyleProps {
  glossFontSize: number;
  fontSize: number;
}

function openOptions() {
  chrome.runtime.sendMessage({ type: "showOptions", source: "TokenDetails", value: null });
}

function preventDefault(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
  event.preventDefault();
  event.stopPropagation();
}

// FIXME: allow setting the theme for popups!
const useStyles = makeStyles<StyleProps>()((theme, params) => {
  return {
    popup: {
      textAlign: "center",
      padding: "3px",
      zIndex: 99999,
      width: "90%",
      maxWidth: "350px",
      minWidth: "180px",
      opacity: 1,
      fontSize: `${Math.min(150, params.fontSize * (params.glossFontSize / 100))}%`,
      position: "absolute",
      display: "block",
      color: theme.palette.text.primary,
      fill: theme.palette.text.primary,
      backgroundColor: theme.palette.background.default,
      borderRadius: "6px",
      borderColor: theme.palette.text.primary,
      borderStyle: "solid",
    },
    icons: { color: theme.palette.text.primary, fontSize: "24px" },
    suggestions: { color: theme.palette.primary.main },
    popupControls: { padding: "3px" },
    container: { textAlign: "left" },
    synonymList: { fontSize: `${Math.min(150, params.fontSize)}%` },
    source: { marginLeft: "6px", padding: "5px 0" },
    sourceName: { boxSizing: "border-box", textAlign: "left" },
    sourcePos: { marginLeft: "12px" },
    sourcePosDefs: { marginLeft: "18px", padding: "0 0 0 5px" },
    header: { boxSizing: "border-box", display: "flex", justifyContent: "space-between" },
    actions: {
      boxSizing: "border-box",
      paddingBottom: "4px",
      display: "flex",
    },
    sound: { boxSizing: "border-box", padding: "2px" },
    best: { boxSizing: "border-box", padding: "2px" },
    sentenceButton: { boxSizing: "border-box", padding: "2px" },
    // FIXME: this needs to get put down there somewhere...
    recentSentences: { textAlign: "left", fontSize: `${Math.min(150, params.fontSize)}%` },
  };
});

export default function TokenDetails({ readerConfig }: Props): ReactElement {
  const invisible = {
    overflow: "auto",
    left: "",
    top: "",
    maxHeight: "",
    padding: "0px",
    visibility: "hidden",
  } as PopupPosition;
  const { classes } = useStyles({
    fontSize: Math.min(150, readerConfig.fontSize * 100),
    glossFontSize: Math.min(150, readerConfig.glossFontSize * 100),
  });
  const [guess, setGuess] = useState("");
  const definitions = useAppSelector((state) => state.definitions);
  const [styles, setStyles] = useState<PopupPosition>(invisible);
  const tokenDetails = useAppSelector((state) => state.ui.tokenDetails);
  const { fromLang, toLang } = useAppSelector((state) => state.userData.user);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);

  const { ref } = useResizeObserver<HTMLDivElement>({
    box: "border-box",
    onResize: ({ width }) => {
      if (width && tokenDetails && tokenDetails.coordinates.eventX) {
        const positioning = positionPopup(
          width,
          tokenDetails.coordinates.eventX,
          tokenDetails.coordinates.eventY,
          window.parent.document.documentElement,
          readerConfig.readerType === "videoReader" && !!isFullscreened(window.parent.document as FullSpecDocument),
        );
        setStyles({ ...positioning });
        setBoxWidth(width);
      } else {
        setExtrasOpen(false);
        setStyles(invisible);
      }
    },
  });

  useEffect(() => {
    (async () => {
      if (tokenDetails) {
        setGuess(
          bestGuess(
            tokenDetails.token,
            await getDefinitions(tokenDetails.token, definitions),
            fromLang,
            toLang,
            readerConfig,
          ),
        );
      }
    })();

    if (tokenDetails) {
      setStyles(
        positionPopup(
          boxWidth,
          tokenDetails.coordinates.eventX,
          tokenDetails.coordinates.eventY,
          window.parent.document.documentElement,
          readerConfig.readerType === "videoReader" && !!isFullscreened(window.parent.document as FullSpecDocument),
        ),
      );
      platformHelper.sendMessage({
        source: "TokenDetails",
        type: "submitUserEvents",
        value: {
          type: "bc_word_lookup",
          data: {
            target_word: tokenDetails.token.l,
            target_sentence: originalSentenceFromTokens(tokenDetails.sentence.t),
          },
          userStatsMode: readerConfig.glossing,
          source: "TokenDetails",
        },
      });
    } else {
      setExtrasOpen(false);
    }
  }, [tokenDetails]);
  return tokenDetails && tokenDetails.token.id && definitions[tokenDetails.token.id] ? (
    <ReaderConfigProvider readerConfig={readerConfig}>
      <div ref={ref} className={classes.popup} style={styles} onClick={(event) => preventDefault(event)}>
        {IS_EXT && (readerConfig as ExtensionReaderState).showSuggestions && (
          <Box>
            <a className={classes.suggestions} href="#" onClick={openOptions}>
              Add pinyin? Change position, colour, size...?
            </a>
            <Divider />
          </Box>
        )}
        <Header
          classes={classes}
          token={tokenDetails.token}
          bestGuess={guess}
          extrasOpen={extrasOpen}
          onToggleExtras={() => setExtrasOpen(!extrasOpen)}
        />
        {extrasOpen && (
          <Extras
            token={tokenDetails.token}
            classes={classes}
            definition={definitions[tokenDetails.token.id]}
            sentence={tokenDetails.sentence}
          />
        )}
        <Container tokenDetails={tokenDetails} definition={definitions[tokenDetails.token.id]} classes={classes} />
      </div>
    </ReaderConfigProvider>
  ) : (
    <></>
  );
}
