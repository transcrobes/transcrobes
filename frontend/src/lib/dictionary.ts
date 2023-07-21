import { AdminStore } from "../app/createStore";
import type { DataManager } from "../data/types";
import { addDefinitions } from "../features/definition/definitionsSlice";
import { addDictionaryProviders } from "../features/dictionary/dictionarySlice";
import { getDefaultLanguageDictionaries } from "./libMethods";
import { DefinitionState, STATUS, SystemLanguage } from "./types";

export async function ensureDefinitionsLoaded(proxy: DataManager, uniqueIds: string[], store: AdminStore) {
  if (uniqueIds.length === 0) return;
  const potentialUserDefinitionGraphs: string[] = [];
  const newDefinitions = await proxy.getDefinitions({ column: "id", values: uniqueIds });
  const defStates = new Map<string, DefinitionState>();
  const l = newDefinitions.length;
  for (let i = 0; i < l; i++) {
    potentialUserDefinitionGraphs.push(newDefinitions[i].graph);
    defStates.set(newDefinitions[i].graph, newDefinitions[i]);
  }

  store.dispatch(addDefinitions([...defStates.values()]));
}

export async function refreshDictionaries(store: AdminStore, proxy: DataManager, fromLang: SystemLanguage) {
  const dictionaries = await proxy.getAllFromDB({
    collection: "userdictionaries",
    queryObj: {
      selector: { status: { $eq: STATUS.ACTIVE } },
    },
  });
  store.dispatch(
    addDictionaryProviders({
      ...getDefaultLanguageDictionaries(fromLang),
      ...dictionaries.reduce((acc, dico) => {
        return { ...acc, [dico.id]: dico.title };
      }, {} as Record<string, string>),
    }),
  );
}
