import dayjs from "dayjs";
import { $enum } from "ts-enum-util";
import { CARD_TYPES } from "../database/Schema";
import { getSettingsValue, setSettingsValue } from "../lib/appSettings";
import { ServiceWorkerProxy } from "../lib/proxies";
import { RepetrobesActivityConfigType, SelectableListElementType } from "../lib/types";

const DATA_SOURCE = "repetrobes/funclib.ts";

const DEFAULT_FORCE_WCPM = false; // repeated from listrobes, show this be the same?
const DEFAULT_ONLY_SELECTED_WORDLIST_REVISIONS = false;
const DEFAULT_QUESTION_SHOW_SYNONYMS = false;
const DEFAULT_QUESTION_SHOW_PROGRESS = false;
const DEFAULT_QUESTION_SHOW_L2_LENGTH_HINT = false;
const DEFAULT_ANSWER_SHOW_RECENTS = false;
const DEFAULT_DAY_STARTS_HOUR = 0;
const DEFAULT_BAD_REVIEW_WAIT_SECS = 600;
const DEFAULT_MAX_NEW = 20;
const DEFAULT_MAX_REVISIONS = 100;
export const EMPTY_ACTIVITY = {
  badReviewWaitSecs: DEFAULT_BAD_REVIEW_WAIT_SECS,
  maxNew: DEFAULT_MAX_NEW,
  maxRevisions: DEFAULT_MAX_REVISIONS,
  forceWcpm: DEFAULT_FORCE_WCPM,
  onlySelectedWordListRevisions: DEFAULT_ONLY_SELECTED_WORDLIST_REVISIONS,
  dayStartsHour: DEFAULT_DAY_STARTS_HOUR,
  wordLists: [],
  showProgress: DEFAULT_QUESTION_SHOW_PROGRESS,
  showSynonyms: DEFAULT_QUESTION_SHOW_SYNONYMS,
  showRecents: DEFAULT_ANSWER_SHOW_RECENTS,
  showL2LengthHint: DEFAULT_QUESTION_SHOW_L2_LENGTH_HINT,
  activeCardTypes: [],
  todayStarts: 0,
};

export async function getUserConfig(
  proxy: ServiceWorkerProxy,
): Promise<RepetrobesActivityConfigType> {
  const savedConf = await getSettingsValue("repetrobes", "config");
  let conf: RepetrobesActivityConfigType;
  if (savedConf) {
    conf = JSON.parse(savedConf);
    // wordlists may have been added or removed since, therefore we get the current wordlists
    // and replace with the existing ones where they still exist (because they might have been selected)
    const wordListMap = new Map<string, SelectableListElementType>();
    const wordLists = await proxy.sendMessagePromise<SelectableListElementType[]>({
      source: DATA_SOURCE,
      type: "getDefaultWordLists",
      value: {},
    });
    conf.wordLists.map((wl) => wordListMap.set(wl.label, wl));
    conf.wordLists = wordLists.map((wl) => wordListMap.get(wl.label) || wl);
    conf.activeCardTypes = Array.from($enum(CARD_TYPES).entries())
      .filter(([_l, v]) => !((v as any) instanceof Function))
      .map(([label, value]) => {
        return {
          label: label,
          value: value.toString(),
          selected:
            conf.activeCardTypes.filter((ct) => ct.value === value.toString() && ct.selected)
              .length > 0,
        };
      });
    conf.todayStarts = (
      new Date().getHours() < conf.dayStartsHour
        ? dayjs().startOf("day").subtract(1, "day")
        : dayjs().startOf("day")
    )
      .add(conf.dayStartsHour, "hour")
      .unix();
  } else {
    // eslint-disable-next-line prefer-const
    conf = {
      ...EMPTY_ACTIVITY,
      activeCardTypes: Array.from($enum(CARD_TYPES).entries())
        .filter(([_l, v]) => !((v as any) instanceof Function))
        .map(([label, value]) => {
          return { label: label, value: value.toString(), selected: true };
        }),
      wordLists: await proxy.sendMessagePromise<SelectableListElementType[]>({
        source: DATA_SOURCE,
        type: "getDefaultWordLists",
        value: {},
      }),
      todayStarts: (new Date().getHours() < EMPTY_ACTIVITY.dayStartsHour
        ? dayjs().startOf("day").subtract(1, "day")
        : dayjs().startOf("day")
      )
        .add(EMPTY_ACTIVITY.dayStartsHour, "hour")
        .unix(),
    };
  }
  setSettingsValue("repetrobes", "config", JSON.stringify(conf));
  return conf;
}
