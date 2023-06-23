import dayjs from "dayjs";
import { $enum } from "ts-enum-util";
import { CARD_TYPES } from "../database/Schema";
import { getSettingsValue, setSettingsValue } from "../lib/appSettings";
import { ServiceWorkerProxy } from "../lib/proxies";
import { RepetrobesActivityConfigType, SelectableListElementType, WordOrdering } from "../lib/types";

const DATA_SOURCE = "repetrobes/funclib.ts";

export const EMPTY_ACTIVITY: RepetrobesActivityConfigType = {
  badReviewWaitSecs: 600,
  maxNew: 20,
  maxRevisions: 100,
  systemWordSelection: true,
  newCardOrdering: "Personal",
  onlySelectedWordListRevisions: false,
  dayStartsHour: 0,
  wordLists: undefined,
  showProgress: true,
  showSynonyms: false,
  showRecents: false,
  showL2LengthHint: false,
  filterUnsure: true,
  showNormalFont: false,
  activeCardTypes: undefined,
  todayStarts: 0,
  translationProviderOrder: undefined,
};

export async function getUserConfig(proxy: ServiceWorkerProxy): Promise<RepetrobesActivityConfigType> {
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
    conf.wordLists?.map((wl) => wordListMap.set(wl.label, wl));
    conf.wordLists = wordLists.map((wl) => wordListMap.get(wl.label) || wl);
    conf.activeCardTypes = Array.from($enum(CARD_TYPES).entries())
      .filter(([_l, v]) => !((v as any) instanceof Function))
      .map(([label, value]) => {
        return {
          label: `widgets.card_type.${label.toLowerCase()}`,
          value: value.toString(),
          selected:
            (conf.activeCardTypes || []).filter((ct) => ct.value === value.toString() && ct.selected).length > 0,
        };
      });
    conf.todayStarts = (
      new Date().getHours() < conf.dayStartsHour ? dayjs().startOf("day").subtract(1, "day") : dayjs().startOf("day")
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
          return { label: `widgets.card_type.${label.toLowerCase()}`, value: value.toString(), selected: true };
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
