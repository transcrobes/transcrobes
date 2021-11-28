import { useState, useEffect, ReactElement } from "react";
import _ from "lodash";
import styled from "styled-components";
import { $enum } from "ts-enum-util";

import { CARD_ID_SEPARATOR, CARD_TYPES } from "../database/Schema";
import { practice, GRADES } from "../lib/review";
import { ListrobesConfigLauncher } from "./listrobes-config-launcher";
import { VocabList } from "./vocab-list";
import { USER_STATS_MODE } from "../lib/lib";
import {
  EMPTY_CARD,
  GraderConfig,
  GradesType,
  SelectableListElementType,
  VocabReview,
} from "../lib/types";
import { AbstractWorkerProxy } from "../lib/proxies";

const DATA_SOURCE = "listrobes.jsx";
const DEFAULT_ITEMS_PER_PAGE = 100;
const DEFAULT_FORCE_WCPM = false;
const MIN_LOOKED_AT_EVENT_DURATION = 1300; // milliseconds
let timeoutId: number;

const GRADE_ICONS: Record<string, JSX.Element> = GRADES.reduce<Record<string, JSX.Element>>(
  (acc, curr) => ((acc[curr["id"]] = curr["icon"]), acc),
  {},
);

function gradesWithoutIcons(grades: GradesType[]) {
  return grades.map((x) => {
    return { id: x.id, content: x.content };
  });
}
function gradesWithIcons(grades: GradesType[]) {
  return grades.map((x) => {
    return { id: x.id, content: x.content, icon: GRADE_ICONS[x.id] };
  });
}

// FIXME: should this be here? Where then???
function getGradeOrder() {
  return GRADES;
}

const ColumnList = styled.div`
  column-width: 150px;
  padding-left: 1em;
  padding-top: 1em;
`;

interface Props {
  proxy: AbstractWorkerProxy;
}

export function Listrobes({ proxy }: Props): ReactElement {
  const [vocab, setVocab] = useState<VocabReview[]>([]);

  const [graderConfig, setGraderConfig] = useState<GraderConfig>({
    gradeOrder: getGradeOrder(),
    forceWcpm: DEFAULT_FORCE_WCPM,
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
      value: { lookupEvents, userStatsMode },
    });
  }

  function handleConfigChange(graderConfigNew: GraderConfig) {
    if (
      graderConfigNew.itemsPerPage !== graderConfig.itemsPerPage ||
      graderConfigNew.forceWcpm !== graderConfig.forceWcpm ||
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
          return practice({ ...EMPTY_CARD, id: `${word.id}${CARD_ID_SEPARATOR}${i}` }, grade, 0);
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
  return (
    <div className="container wide">
      <ColumnList>
        <ListrobesConfigLauncher
          loading={loading}
          graderConfig={graderConfig}
          onConfigChange={handleConfigChange}
        />
        <VocabList
          graderConfig={graderConfig}
          vocab={vocab}
          loading={loading}
          onGradeChange={handleGradeChange}
          onValidate={handleValidate}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        />
      </ColumnList>
    </div>
  );
}

export default Listrobes;
