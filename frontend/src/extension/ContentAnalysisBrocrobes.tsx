import { useTheme } from "@mui/material";
import { Box } from "@mui/system";
import _ from "lodash";
import * as React from "react";
import { useAppSelector } from "../app/hooks";
import ContentAnalysis from "../components/ContentAnalysis";
import { EXTENSION_READER_ID } from "../features/content/extensionReaderSlice";
import { sumValues } from "../lib/libMethods";
import { ContentStats } from "../lib/types";

export default function ContentAnalysisBrocrobes() {
  const [removed, setRemoved] = React.useState(false);
  const outsideStats = useAppSelector((state) => state.stats);
  const readerConfig = useAppSelector((state) => state.extensionReader[EXTENSION_READER_ID]);

  const [knownChars, setKnownChars] = React.useState(0);
  const [chars, setChars] = React.useState(0);
  const [knownWords, setKnownWords] = React.useState(0);
  const [words, setWords] = React.useState(0);
  const [knownCharsTypes, setKnownCharsTypes] = React.useState(0);
  const [charsTypes, setCharsTypes] = React.useState(0);
  const [knownWordsTypes, setKnownWordsTypes] = React.useState(0);
  const [wordsTypes, setWordsTypes] = React.useState(0);
  const [meanSentenceLength, setMeanSentenceLength] = React.useState(0);

  const theme = useTheme();
  const [colour, setColour] = React.useState(theme.palette.success.main);

  const debounce = React.useCallback(
    _.debounce(
      (stats: ContentStats) => {
        const kc = sumValues(stats.knownChars);
        const c = sumValues(stats.chars);
        const kw = sumValues(stats.knownWords);
        const w = sumValues(stats.words);
        const kct = Object.keys(stats.knownChars).length;
        const ct = Object.keys(stats.chars).length;
        const kwt = Object.keys(stats.knownWords).length;
        const wt = Object.keys(stats.words).length;
        // FIXME: there is a more efficient way to do this
        const ml = _.mean(Object.entries(stats.sentenceLengths).flatMap(([x, y]) => Array(y).fill(parseInt(x)))) || 0;
        setKnownChars(kc);
        setChars(c);
        setKnownWords(kw);
        setWords(w);
        setKnownCharsTypes(kct);
        setCharsTypes(ct);
        setKnownWordsTypes(kwt);
        setWordsTypes(wt);
        setMeanSentenceLength(ml);
        if (kc / c < 0.7 || kw / w < 0.5 || ml > 40) {
          setColour(theme.palette.warning.main);
        } else if (kc / c < 0.8 || kw / w < 0.8 || ml > 30) {
          setColour(theme.palette.info.main);
        }
      },
      1000,
      { maxWait: 2000 },
    ),
    [],
  );

  React.useEffect(() => {
    debounce(outsideStats);
  }, [
    outsideStats.chars,
    outsideStats.knownChars,
    outsideStats.knownWords,
    outsideStats.sentenceLengths,
    outsideStats.words,
  ]);
  const topFlat = readerConfig.analysisPosition === "top-right";
  const boxRadii = topFlat ? "0px 10px 0px 10px" : "10px 0px 10px 0px";
  const leftButtonRadii = topFlat ? "0px 0px 0px 10px" : "10px 0px 0px 0px";
  const rightButtonRadii = topFlat ? "0px 0px 10px 0px" : "0px 10px 0px 0px";

  const vertPosition = topFlat ? { top: 0 } : { bottom: 0 };
  return !removed ? (
    <Box
      style={{
        zIndex: 1000,
        position: "fixed",
        right: "0",
        ...vertPosition,
      }}
    >
      <ContentAnalysis
        boxRadii={boxRadii}
        leftButtonRadii={leftButtonRadii}
        rightButtonRadii={rightButtonRadii}
        knownChars={knownChars}
        chars={chars}
        knownWords={knownWords}
        words={words}
        knownCharsTypes={knownCharsTypes}
        charsTypes={charsTypes}
        knownWordsTypes={knownWordsTypes}
        wordsTypes={wordsTypes}
        meanSentenceLength={meanSentenceLength}
        showRemove={true}
        setRemoved={setRemoved}
        colour={colour}
      />
    </Box>
  ) : (
    <></>
  );
}
