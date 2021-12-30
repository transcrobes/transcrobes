import { useState, useEffect, ReactElement } from "react";
import _ from "lodash";
import { $enum } from "ts-enum-util";

import { CARD_TYPES, getCardId } from "../database/Schema";
import { practice, GRADES } from "../lib/review";
import ListrobesConfigLauncher from "./ListrobesConfigLauncher";
import { VocabList } from "./VocabList";
import { USER_STATS_MODE } from "../lib/lib";
import {
  EMPTY_CARD,
  GraderConfig,
  GradesType,
  SelectableListElementType,
  VocabReview,
  WordOrdering,
} from "../lib/types";
import { AbstractWorkerProxy } from "../lib/proxies";
import { TopToolbar } from "react-admin";
import { Container, makeStyles } from "@material-ui/core";
import HelpButton from "../components/HelpButton";
import SearchLoading from "../components/SearchLoading";

const DATA_SOURCE = "listrobes.jsx";
const DEFAULT_ITEMS_PER_PAGE = 50;
const DEFAULT_ITEM_ORDERING: WordOrdering = "Natural";
const MIN_LOOKED_AT_EVENT_DURATION = 1300; // milliseconds
let timeoutId: number;

const useStyles = makeStyles(() => ({
  loading: {
    textAlign: "center",
  },
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

  const [graderConfig, setGraderConfig] = useState<GraderConfig>({
    gradeOrder: GRADES,
    itemOrdering: DEFAULT_ITEM_ORDERING,
    itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
    wordLists: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async function () {
      const wordLists = await proxy.sendMessagePromise<SelectableListElementType[]>({
        source: DATA_SOURCE,
        type: "getDefaultWordLists",
        value: {},
      });
      const gConfig = { ...graderConfig, wordLists };
      setGraderConfig(gConfig);
      const vocabbie = await proxy.sendMessagePromise<VocabReview[]>({
        source: DATA_SOURCE,
        type: "getVocabReviews",
        value: {
          ...gConfig,
          gradeOrder: gradesWithoutIcons(gConfig.gradeOrder),
        },
      });
      setVocab(vocabbie);
      setLoading(false);
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

  function handleConfigChange(graderConfigNew: GraderConfig) {
    if (
      graderConfigNew.itemsPerPage !== graderConfig.itemsPerPage ||
      graderConfigNew.itemOrdering !== graderConfig.itemOrdering ||
      !_.isEqual(graderConfigNew.wordLists, graderConfig.wordLists)
    ) {
      proxy.sendMessage(
        {
          source: DATA_SOURCE,
          type: "getVocabReviews",
          value: { ...graderConfigNew, gradeOrder: gradesWithoutIcons(graderConfigNew.gradeOrder) },
        },
        (vocab: VocabReview[]) => {
          setGraderConfig(graderConfigNew);
          setVocab(vocab);
          return "";
        },
        () => {
          return "";
        },
      );
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

  function handleValidate() {
    setLoading(true);
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
    proxy.sendMessage(
      {
        source: DATA_SOURCE,
        type: "createCards",
        value: newCards,
      },
      () => {
        proxy.sendMessage(
          {
            source: DATA_SOURCE,
            type: "getVocabReviews",
            value: {
              ...graderConfig,
              gradeOrder: gradesWithoutIcons(graderConfig.gradeOrder),
            },
          },
          (vocab) => {
            setVocab(vocab);
            setLoading(false);
            return "";
          },
          () => {
            return "";
          },
        );
        return "";
      },
      () => {
        return "";
      },
    );

    submitLookupEvents(consultedDefinitions, USER_STATS_MODE.L1);
  }
  const classes = useStyles();
  const helpUrl = "https://transcrob.es/page/software/configure/listrobes/";

  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <ListrobesConfigLauncher
          loading={loading}
          graderConfig={graderConfig}
          onConfigChange={handleConfigChange}
        />
        <HelpButton url={helpUrl} />
      </TopToolbar>

      <Container maxWidth="lg">
        {loading && (
          <div className={classes.loading}>
            <SearchLoading />
          </div>
        )}
        <div className={classes.columnList}>
          <VocabList
            graderConfig={graderConfig}
            vocab={vocab}
            loading={loading}
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
