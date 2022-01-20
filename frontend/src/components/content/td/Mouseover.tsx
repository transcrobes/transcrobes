import { makeStyles } from "@material-ui/core";
import { ReactElement, useEffect, useState } from "react";
import useResizeObserver from "use-resize-observer";
import { useAppSelector } from "../../../app/hooks";
import { getPopoverText, positionPopup } from "../../../lib/componentMethods";
import { originalSentenceFromTokens } from "../../../lib/funclib";
import { platformHelper } from "../../../lib/proxies";
import { POPOVER_MIN_LOOKED_AT_EVENT_DURATION, PopupPosition, ReaderState } from "../../../lib/types";

const useStyles = makeStyles({
  popover: {
    padding: ".3em",
    borderColor: "#fff",
    borderWidth: "medium",
    borderStyle: "solid",
    backgroundColor: "black !important",
    zIndex: 99999,
    opacity: "1 !important",
    minWidth: "120px",
    color: "#fff",
    maxWidth: "250px",
    textAlign: "center",
    borderRadius: "6px",
    position: "absolute",
    display: "block",
  },
});

export type Props = {
  readerConfig: ReaderState;
};

export default function Mouseover({ readerConfig }: Props): ReactElement {
  const [text, setText] = useState("");
  const invisible = {
    left: "",
    top: "",
    visibility: "hidden",
  } as PopupPosition;
  const [styles, setStyles] = useState<PopupPosition>(invisible);

  const knownWords = useAppSelector((state) => state.knownCards);
  const definitions = useAppSelector((state) => state.definitions);
  const mouseover = useAppSelector((state) => state.ui.mouseover);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const [timeoutId, setTimeoutId] = useState(0);
  const classes = useStyles();
  const { ref } = useResizeObserver<HTMLDivElement>({
    box: "border-box",
    onResize: ({ width }) => {
      if (width && mouseover && mouseover.coordinates.eventX) {
        const positioning = positionPopup(
          width,
          mouseover.coordinates.eventX,
          mouseover.coordinates.eventY,
          window.parent.document.documentElement,
        );
        positioning.visibility = "visible";
        setStyles(positioning);
      }
    },
  });
  useEffect(() => {
    if (mouseover) {
      getPopoverText(mouseover.token, knownWords, definitions, fromLang).then((lText) => {
        setText(lText);
        setTimeoutId(
          window.setTimeout(() => {
            platformHelper.sendMessage({
              source: "Mouseover",
              type: "submitUserEvents",
              value: {
                type: "bc_word_lookup",
                data: {
                  target_word: mouseover.token.l,
                  target_sentence: originalSentenceFromTokens(mouseover.sentence.t),
                },
                userStatsMode: readerConfig.glossing,
                source: "Mouseover",
              },
            });
            setTimeoutId(0);
          }, POPOVER_MIN_LOOKED_AT_EVENT_DURATION),
        );
      });
    } else {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      setStyles(invisible);
      setText("");
    }
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [mouseover]);

  return (
    <div ref={ref} style={styles} className={classes.popover}>
      {text}
    </div>
  );
}
