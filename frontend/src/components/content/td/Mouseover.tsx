import { Box } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import useResizeObserver from "use-resize-observer";
import { useAppSelector } from "../../../app/hooks";
import { getL1, getL2Simplified, getSound, positionPopup } from "../../../lib/componentMethods";
import { originalSentenceFromTokens, say, soundWithSeparators } from "../../../lib/funclib";
import { complexPosToSimplePosLabels } from "../../../lib/libMethods";
import { platformHelper } from "../../../lib/proxies";
import {
  DEFINITION_LOADING,
  DefinitionsState,
  InputLanguage,
  POPOVER_MIN_LOOKED_AT_EVENT_DURATION,
  POPOVER_MIN_LOOKED_AT_SOUND_DURATION,
  PopupPosition,
  ReaderState,
  SerialisableDayCardWords,
  SystemLanguage,
  TokenType,
} from "../../../lib/types";
import SoundBox from "../../SoundBox";

export async function getPopoverTextNode(
  token: TokenType,
  uCardWords: Partial<SerialisableDayCardWords>,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  systemLang: SystemLanguage,
  readerConfig: ReaderState,
) {
  const gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";
  const l1 = await getL1(token, definitions, fromLang, systemLang, readerConfig, gloss);
  if (l1 === DEFINITION_LOADING) return <span>{DEFINITION_LOADING}</span>;
  const l2 = await getL2Simplified(token, l1, uCardWords, definitions, fromLang, systemLang, readerConfig);
  const s = await getSound(token, definitions, fromLang);
  const sound = s.map((sound, i) => soundWithSeparators(sound, i, fromLang));
  return (
    <Box component="span">
      <span>
        {complexPosToSimplePosLabels(token.pos!, fromLang, systemLang)}: {l1} {l2 !== l1 ? `: ${l2}` : ""}
      </span>
      :{" "}
      {sound?.map((s, index) => (
        <SoundBox key={`${s}${index}`} sound={s} index={index} />
      ))}
    </Box>
  );
}

export type Props = {
  readerConfig: ReaderState;
};

export default function Mouseover({ readerConfig }: Props): ReactElement {
  const [textNode, setTextNode] = useState<ReactElement>();
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
      getPopoverTextNode(mouseover.token, knownWords, definitions, fromLang, toLang, readerConfig).then((node) => {
        setTextNode(node);
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
      setTextNode(undefined);
    }
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [mouseover]);

  return (
    <Box
      ref={ref}
      style={styles}
      sx={{
        padding: ".3em",
        borderColor: "text.primary",
        borderWidth: "medium",
        borderStyle: "solid",
        backgroundColor: ["background.default", "!important"],
        zIndex: 99999,
        opacity: [1, "!important"],
        minWidth: "120px",
        color: "text.primary",
        maxWidth: "250px",
        textAlign: "center",
        borderRadius: "6px",
        position: "absolute",
        display: "block",
      }}
    >
      {textNode}
    </Box>
  );
}
