import { Box, Container } from "@mui/material";
import _ from "lodash";
import { ReactElement, useEffect, useState } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { BASIC_GRADES, GRADES } from "../components/Common";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import WatchDemo from "../components/WatchDemo";
import type { DataManager } from "../data/types";
import { setLoading } from "../features/ui/uiSlice";
import {
  ActionEventData,
  DOCS_DOMAIN,
  GraderConfig,
  GradesType,
  LISTROBES_YT_VIDEO,
  MIN_KNOWN_BEFORE_ADVANCED,
  PracticeDetailsType,
  USER_STATS_MODE,
  VocabReview,
  WordOrdering,
} from "../lib/types";
import { practiceCardsForWords } from "../workers/common-db";
import BasicGradeChooser from "./BasicGradeChooser";
import ListrobesConfigLauncher from "./ListrobesConfigLauncher";
import MinEntryComplete from "./MinEntryComplete";
import { VocabList } from "./VocabList";

const DATA_SOURCE = "listrobes.jsx";
const DEFAULT_ITEMS_PER_PAGE = 50;
const DEFAULT_ITEM_ORDERING: WordOrdering = "Natural";
const MIN_LOOKED_AT_EVENT_DURATION = 1300; // milliseconds

let timeoutId: number;

interface Props {
  proxy: DataManager;
}

export function Listrobes({ proxy }: Props): ReactElement {
  const [vocab, setVocab] = useState<VocabReview[]>([]);
  const dispatch = useAppDispatch();
  // this is actually not what we want, but nevermind...
  const initWordsCount = useAppSelector((state) => Object.keys(state.knownWords.knownWordGraphs || {}).length);
  const [lastWordsCount, setLastWordsCount] = useState(initWordsCount);
  const [wordsCount, setWordsCount] = useState(0);
  const { fromLang, toLang } = useAppSelector((state) => state.userData.user);
  const [isAdvanced, setIsAdvanced] = useState(initWordsCount > MIN_KNOWN_BEFORE_ADVANCED);
  const translate = useTranslate();

  const [graderConfig, setGraderConfig] = useState<GraderConfig>({
    isAdvanced,
    toLang,
    fromLang,
    gradeOrder: GRADES,
    itemOrdering: DEFAULT_ITEM_ORDERING,
    itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
    wordLists: [],
  });
  useEffect(() => {
    (async () => {
      const wc = await proxy.getKnownWordCount(true);
      setWordsCount(wc);
    })();
  }, []);
  useEffect(() => {
    setIsAdvanced(wordsCount > MIN_KNOWN_BEFORE_ADVANCED);
  }, [wordsCount]);

  function gradesWithoutIcons(grades: GradesType[]) {
    return grades.map((x) => {
      return { id: x.id, content: translate(x.content) };
    });
  }
  useEffect(() => {
    const newOrder = graderConfig.isAdvanced ? GRADES : BASIC_GRADES;
    setGraderConfig({
      ...graderConfig,
      gradeOrder: newOrder,
    });
    if (!graderConfig.isAdvanced) {
      setVocab((vocab || []).map((v) => ({ ...v, clicks: v.clicks >= newOrder.length ? 0 : v.clicks })));
    }
  }, [graderConfig.isAdvanced]);

  useEffect(() => {
    dispatch(setLoading(true));
    (async function () {
      const wordLists = await proxy.getDefaultWordLists();

      const gConfig = {
        ...graderConfig,
        isAdvanced,
        wordLists,
        toLang,
        gradeOrder: graderConfig.isAdvanced ? GRADES : BASIC_GRADES,
      };
      setGraderConfig(gConfig);
      const vocabbie = await proxy.getVocabReviews({
        graderConfig: {
          ...gConfig,
          gradeOrder: gradesWithoutIcons(gConfig.gradeOrder), // send only the IDs, this is a hack...
          fromLang,
        },
      });
      setVocab(vocabbie || []);
      dispatch(setLoading(undefined));
    })();
  }, []);

  function submitLookupEvents(lookupEvents: any[], userStatsMode: number) {
    proxy.submitLookupEvents({ lemmaAndContexts: lookupEvents, userStatsMode, source: DATA_SOURCE });
  }

  async function handleConfigChange(graderConfigNew: GraderConfig) {
    if (
      graderConfigNew.itemsPerPage !== graderConfig.itemsPerPage ||
      graderConfigNew.itemOrdering !== graderConfig.itemOrdering ||
      !_.isEqual(graderConfigNew.wordLists, graderConfig.wordLists)
    ) {
      const vocabbie = await proxy.getVocabReviews({
        graderConfig: {
          ...graderConfigNew,
          gradeOrder: gradesWithoutIcons(graderConfigNew.gradeOrder),
        },
      });
      setVocab(vocabbie || []);
      setGraderConfig(graderConfigNew);
    } else {
      setGraderConfig(graderConfigNew);
    }
  }

  function handleMouseOver(index: number) {
    if (!timeoutId) {
      timeoutId = window.setTimeout(() => {
        const items = [...(vocab || [])];
        items[index].lookedUp = true;
        setVocab(items);
        timeoutId = 0;
      }, MIN_LOOKED_AT_EVENT_DURATION);
    }
  }

  function handleMouseOut() {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = 0;
    }
  }

  function handleGradeChange(index: number) {
    const items = [...(vocab || [])];
    items[index].clicks = (items[index].clicks + 1) % graderConfig.gradeOrder.length;
    setVocab(items);
  }

  async function handleValidate() {
    dispatch(setLoading(true));
    const newCards: PracticeDetailsType[] = [];
    const consultedDefinitions: ActionEventData[] = [];
    setLastWordsCount(wordsCount);
    for (const word of vocab || []) {
      if (word.lookedUp) {
        consultedDefinitions.push({ target_word: word.graph, target_sentence: "" });
      }
      const grade = parseInt(graderConfig.gradeOrder[word.clicks].id);
      newCards.push({ wordId: word.id, grade });
    }
    await practiceCardsForWords(proxy, newCards);

    const vocabbie = await proxy.getVocabReviews({
      graderConfig: {
        ...graderConfig,
        gradeOrder: gradesWithoutIcons(graderConfig.gradeOrder),
      },
    });
    setWordsCount(await proxy.getKnownWordCount(true));
    setVocab(vocabbie || []);
    dispatch(setLoading(undefined));
    submitLookupEvents(consultedDefinitions, USER_STATS_MODE.L1);
  }
  const helpUrl = `//${DOCS_DOMAIN}/page/software/configure/listrobes/`;
  return (
    <>
      <TopToolbar
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          maxHeight: "64px",
        }}
      >
        <ListrobesConfigLauncher graderConfig={graderConfig} onConfigChange={handleConfigChange} />
        <WatchDemo url={LISTROBES_YT_VIDEO} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      {!graderConfig.isAdvanced && <BasicGradeChooser graderConfig={graderConfig} setGraderConfig={setGraderConfig} />}
      {wordsCount >= MIN_KNOWN_BEFORE_ADVANCED && lastWordsCount < MIN_KNOWN_BEFORE_ADVANCED && <MinEntryComplete />}
      <Container maxWidth="lg">
        <Loading />
        <Box
          sx={{
            columnWidth: "150px",
            paddingLeft: "1em",
            paddingTop: "1em",
          }}
        >
          <VocabList
            graderConfig={graderConfig}
            vocab={vocab || []}
            onGradeChange={handleGradeChange}
            onValidate={handleValidate}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          />
        </Box>
      </Container>
    </>
  );
}

export default Listrobes;
