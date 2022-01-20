import { makeStyles, Theme } from "@material-ui/core";
import { ReactElement, useEffect, useState } from "react";
import { PopupPosition, ReaderState } from "../../../lib/types";
import Extras from "./Extras";
import Header from "./Header";
import Messages from "./Messages";
import { getWord, positionPopup } from "../../../lib/componentMethods";
import Container from "./Container";
import { bestGuess } from "../../../lib/libMethods";
import { useAppSelector } from "../../../app/hooks";
import useResizeObserver from "use-resize-observer";
import { originalSentenceFromTokens } from "../../../lib/funclib";
import { platformHelper } from "../../../lib/proxies";

export type Props = {
  readerConfig: ReaderState;
};

export interface StyleProps {
  glossFontSize: number;
  fontSize: number;
}
// FIXME: allow setting the theme for popups!
const useStyles = makeStyles<Theme, StyleProps>((theme: Theme) => ({
  popup: (props) => ({
    textAlign: "center",
    borderRadius: "6px",
    padding: "3px 0",
    zIndex: 99999,
    width: "90%",
    maxWidth: "350px",
    minWidth: "180px",
    opacity: 1,
    fontSize: `${props.fontSize * (props.glossFontSize / 100)}%`,
    position: "absolute",
    display: "block",
    // FIXME: added for testing, get from the theme!
    color: "white",
    fill: "white",
    backgroundColor: "black",
  }),
  container: { textAlign: "left" },
  synonymList: (props) => ({ fontSize: `${props.fontSize}%` }),
  source: { marginLeft: "6px", padding: "5px 0" },
  sourceName: { boxSizing: "border-box", textAlign: "left" },
  sourcePos: { marginLeft: "12px" },
  sourcePosDefs: { marginLeft: "18px", padding: "0 0 0 5px" },
  header: { boxSizing: "border-box", display: "flex", justifyContent: "space-between" },
  actions: {
    boxSizing: "border-box",
    paddingBottom: "4px",
    display: "flex",
    justifyContent: "center",
  },
  sound: { boxSizing: "border-box", padding: "2px" },
  best: { boxSizing: "border-box", padding: "2px" },
  sentenceButton: { boxSizing: "border-box", padding: "2px" },
  // FIXME: this needs to get put down there somewhere...
  recentSentences: (props) => ({ textAlign: "left", fontSize: `${props.fontSize}%` }),
}));

export default function TokenDetails({ readerConfig }: Props): ReactElement {
  const invisible = {
    left: "",
    top: "",
    visibility: "hidden",
  } as PopupPosition;
  const classes = useStyles({
    fontSize: readerConfig.fontSize * 100,
    glossFontSize: readerConfig.glossFontSize * 100,
  });
  const [guess, setGuess] = useState("");
  const definitions = useAppSelector((state) => state.definitions);
  const [message, setMessage] = useState("");
  const [styles, setStyles] = useState<PopupPosition>(invisible);
  const tokenDetails = useAppSelector((state) => state.ui.tokenDetails);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const { ref } = useResizeObserver<HTMLDivElement>({
    box: "border-box",
    onResize: ({ width }) => {
      (async () => {
        if (width && tokenDetails && tokenDetails.coordinates.eventX) {
          const def =
            (tokenDetails.token.id && definitions[tokenDetails.token.id]) || (await getWord(tokenDetails.token.l));
          setGuess(bestGuess(tokenDetails.token, def, fromLang));

          const positioning = positionPopup(
            width,
            tokenDetails.coordinates.eventX,
            tokenDetails.coordinates.eventY,
            window.parent.document.documentElement,
          );
          setStyles({ ...positioning, visibility: "visible" });
        } else {
          setExtrasOpen(false);
          setStyles(invisible);
        }
      })();
    },
  });

  function preventDefault(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
    event.stopPropagation();
  }

  useEffect(() => {
    if (tokenDetails) {
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
    }
  }, [tokenDetails]);

  return tokenDetails && tokenDetails.token.id && definitions[tokenDetails.token.id] ? (
    <div ref={ref} className={classes.popup} style={styles} onClick={(event) => preventDefault(event)}>
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
      {/* maybe not necessary? */}
      <Messages message={message} />
      <Container tokenDetails={tokenDetails} definition={definitions[tokenDetails.token.id]} classes={classes} />
    </div>
  ) : (
    <></>
  );
}
