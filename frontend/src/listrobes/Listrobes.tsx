import { Container } from "@mui/material";
import _ from "lodash";
import { ReactElement, useEffect, useState } from "react";
import { TopToolbar } from "react-admin";
import { $enum } from "ts-enum-util";
import { makeStyles } from "tss-react/mui";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { BASIC_GRADES, GRADES } from "../components/Common";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import { CARD_TYPES, getCardId, GRADE } from "../database/Schema";
import { setCardWordsState } from "../features/card/knownCardsSlice";
import { setLoading } from "../features/ui/uiSlice";
import { AbstractWorkerProxy } from "../lib/proxies";
import { practice } from "../lib/review";
import {
  DOCS_DOMAIN,
  EMPTY_CARD,
  GraderConfig,
  GradesType,
  MIN_KNOWN_BEFORE_ADVANCED,
  SelectableListElementType,
  SerialisableDayCardWords,
  USER_STATS_MODE,
  VocabReview,
  WordOrdering,
} from "../lib/types";
import BasicGradeChooser from "./BasicGradeChooser";
import ListrobesConfigLauncher from "./ListrobesConfigLauncher";
import { VocabList } from "./VocabList";

const DATA_SOURCE = "listrobes.jsx";
const DEFAULT_ITEMS_PER_PAGE = 50;
const DEFAULT_ITEM_ORDERING: WordOrdering = "Natural";
const MIN_LOOKED_AT_EVENT_DURATION = 1300; // milliseconds

let timeoutId: number;

const useStyles = makeStyles()(() => ({
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  columnList: {
    columnWidth: "150px",
    paddingLeft: "1em",
    paddingTop: "1em",
  },
}));

function gradesWithoutIcons(grades: GradesType[]) {
  return grades.map((x) => {
    return { id: x.id, content: x.content };
  });
}
interface Props {
  proxy: AbstractWorkerProxy;
}

export function Listrobes({ proxy }: Props): ReactElement {
  const [vocab, setVocab] = useState<VocabReview[]>([]);
  const dispatch = useAppDispatch();
  const wordsCount = useAppSelector((state) => Object.keys(state.knownCards.allCardWordGraphs || {}).length);
  const isAdvanced = wordsCount > MIN_KNOWN_BEFORE_ADVANCED;

  const [graderConfig, setGraderConfig] = useState<GraderConfig>({
    isAdvanced,
    gradeOrder: GRADES,
    itemOrdering: DEFAULT_ITEM_ORDERING,
    itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
    wordLists: [],
  });
  useEffect(() => {
    const newOrder = graderConfig.isAdvanced ? GRADES : BASIC_GRADES;
    setGraderConfig({
      ...graderConfig,
      gradeOrder: newOrder,
    });
    if (!graderConfig.isAdvanced) {
      setVocab(vocab.map((v) => ({ ...v, clicks: v.clicks >= newOrder.length ? 0 : v.clicks })));
    }
  }, [graderConfig.isAdvanced]);

  useEffect(() => {
    dispatch(setLoading(true));
    (async function () {
      const wordLists = await proxy.sendMessagePromise<SelectableListElementType[]>({
        source: DATA_SOURCE,
        type: "getDefaultWordLists",
        value: {},
      });
      const gConfig = {
        ...graderConfig,
        isAdvanced,
        wordLists,
        gradeOrder: graderConfig.isAdvanced ? GRADES : BASIC_GRADES,
      };
      setGraderConfig(gConfig);
      const vocabbie = await proxy.sendMessagePromise<VocabReview[]>({
        source: DATA_SOURCE,
        type: "getVocabReviews",
        value: {
          ...gConfig,
          gradeOrder: gradesWithoutIcons(gConfig.gradeOrder), // send only the IDs, this is a hack...
        },
      });
      setVocab(vocabbie);
      dispatch(setLoading(undefined));
    })();
  }, []);

  // FIXME: this is duplicated in notrobes.tsx
  // FIXME: any and migrated userStatsMode to enum and do proper lookupEvents
  function submitLookupEvents(lookupEvents: any[], userStatsMode: number) {
    proxy.sendMessage({
      source: DATA_SOURCE,
      type: "submitLookupEvents",
      value: { lemmaAndContexts: lookupEvents, userStatsMode, source: DATA_SOURCE },
    });
  }

  async function handleConfigChange(graderConfigNew: GraderConfig) {
    if (
      graderConfigNew.itemsPerPage !== graderConfig.itemsPerPage ||
      graderConfigNew.itemOrdering !== graderConfig.itemOrdering ||
      !_.isEqual(graderConfigNew.wordLists, graderConfig.wordLists)
    ) {
      setVocab(
        await proxy.sendMessagePromise<VocabReview[]>({
          source: DATA_SOURCE,
          type: "getVocabReviews",
          value: { ...graderConfigNew, gradeOrder: gradesWithoutIcons(graderConfigNew.gradeOrder) },
        }),
      );
      setGraderConfig(graderConfigNew);
    } else {
      setGraderConfig(graderConfigNew);
    }
  }

  function handleMouseOver(index: number) {
    if (!timeoutId) {
      timeoutId = window.setTimeout(() => {
        const items = [...vocab];
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
    const items = [...vocab];
    items[index].clicks = (items[index].clicks + 1) % graderConfig.gradeOrder.length;
    setVocab(items);
  }

  async function handleValidate() {
    dispatch(setLoading(true));
    const newCards = [];
    const consultedDefinitions = [];
    for (const word of vocab) {
      if (word.lookedUp) {
        consultedDefinitions.push({ target_word: word.graph, target_sentence: "" });
      }
      const grade = parseInt(graderConfig.gradeOrder[word.clicks].id);
      const cards = $enum(CARD_TYPES)
        .getValues()
        .map((i) => {
          return practice({ ...EMPTY_CARD, id: getCardId(word.id, i) }, grade, 0);
        });
      newCards.push(...cards);
    }
    await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "createCards",
      value: newCards,
    });
    dispatch(
      setCardWordsState(
        await proxy.sendMessagePromise<SerialisableDayCardWords>({
          source: DATA_SOURCE,
          type: "getSerialisableCardWords",
        }),
      ),
    );

    setVocab(
      await proxy.sendMessagePromise<VocabReview[]>({
        source: DATA_SOURCE,
        type: "getVocabReviews",
        value: {
          ...graderConfig,
          gradeOrder: gradesWithoutIcons(graderConfig.gradeOrder),
        },
      }),
    );
    dispatch(setLoading(undefined));
    submitLookupEvents(consultedDefinitions, USER_STATS_MODE.L1);
  }
  const { classes } = useStyles();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/configure/listrobes/`;
  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <ListrobesConfigLauncher graderConfig={graderConfig} onConfigChange={handleConfigChange} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      {!graderConfig.isAdvanced && <BasicGradeChooser graderConfig={graderConfig} setGraderConfig={setGraderConfig} />}
      <Container maxWidth="lg">
        <Loading />
        <div className={classes.columnList}>
          <VocabList
            graderConfig={graderConfig}
            vocab={vocab}
            onGradeChange={handleGradeChange}
            onValidate={handleValidate}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          />
        </div>
      </Container>
    </>
  );
}

export default Listrobes;
