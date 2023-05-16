import { ReactElement, useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import useResizeObserver from "use-resize-observer";
import { useAppSelector } from "../../../app/hooks";
import { getPopoverText, positionPopup } from "../../../lib/componentMethods";
import { originalSentenceFromTokens, say } from "../../../lib/funclib";
import { platformHelper } from "../../../lib/proxies";
import {
  POPOVER_MIN_LOOKED_AT_EVENT_DURATION,
  POPOVER_MIN_LOOKED_AT_SOUND_DURATION,
  PopupPosition,
  ReaderState,
} from "../../../lib/types";

const useStyles = makeStyles()((theme) => ({
  popover: {
    padding: ".3em",
    borderColor: theme.palette.text.primary,
    borderWidth: "medium",
    borderStyle: "solid",
    backgroundColor: [theme.palette.background.default, "!important"],
    zIndex: 99999,
    opacity: [1, "!important"],
    minWidth: "120px",
    color: theme.palette.text.primary,
    maxWidth: "250px",
    textAlign: "center",
    borderRadius: "6px",
    position: "absolute",
    display: "block",
  },
}));

export type Props = {
  readerConfig: ReaderState;
};

export default function Mouseover({ readerConfig }: Props): ReactElement {
  const [text, setText] = useState("");
  const invisible = {
    overflow: "auto",
    left: "",
    top: "",
    maxHeight: "",
    padding: "0px",
    borderWidth: "0px",
    visibility: "hidden",
  } as PopupPosition;
  const [styles, setStyles] = useState<PopupPosition>(invisible);

  const knownWords = useAppSelector((state) => state.knownCards);
  const definitions = useAppSelector((state) => state.definitions);
  const mouseover = useAppSelector((state) => state.ui.mouseover);
  const { fromLang, toLang } = useAppSelector((state) => state.userData.user);
  const [timeoutId, setTimeoutId] = useState(0);
  const { classes } = useStyles();
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
      getPopoverText(mouseover.token, knownWords, definitions, fromLang, toLang, readerConfig).then((lText) => {
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
        setTimeoutId(
          window.setTimeout(() => {
            if (readerConfig.sayOnMouseover) {
              say(mouseover.token.w || mouseover.token.l, fromLang);
            }
          }, POPOVER_MIN_LOOKED_AT_SOUND_DURATION),
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
