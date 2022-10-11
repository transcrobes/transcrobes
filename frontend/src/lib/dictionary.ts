import { AdminStore } from "../app/createStore";
import { addDefinitions } from "../features/definition/definitionsSlice";
import { addDictionaryProviders } from "../features/dictionary/dictionarySlice";
import { getDefaultLanguageDictionaries } from "./libMethods";
import { AbstractWorkerProxy } from "./proxies";
import { DefinitionState, DefinitionType, STATUS, SystemLanguage, UserDefinitionType, UserDictionary } from "./types";

const DATA_SOURCE = "dictionary";

export async function ensureDefinitionsLoaded(proxy: AbstractWorkerProxy, uniqueIds: string[], store: AdminStore) {
  if (uniqueIds.length === 0) return;
  const potentialUserDefinitionGraphs: string[] = [];
  const newDefinitions = await proxy.sendMessagePromise<DefinitionType[]>({
    source: DATA_SOURCE,
    type: "getByIds",
    value: { collection: "definitions", ids: uniqueIds },
  });
  const defStates = new Map<string, DefinitionState>();
  const l = newDefinitions.length;
  for (let i = 0; i < l; i++) {
    potentialUserDefinitionGraphs.push(newDefinitions[i].graph);
    defStates.set(newDefinitions[i].graph, {
      ...newDefinitions[i],
      glossToggled: false,
    });
  }

  const dictionaryEntries = await userDictionaryEntriesByGraph(proxy, store, potentialUserDefinitionGraphs);
  for (const [dictionaryId, dictionary] of Object.entries(dictionaryEntries)) {
    for (const graph of potentialUserDefinitionGraphs) {
      const posTranslations = dictionary[graph]?.translations;
      if (posTranslations) {
        const def = defStates.get(graph);
        def?.providerTranslations.push({
          provider: dictionaryId,
          posTranslations,
        });
      }
    }
  }
  store.dispatch(addDefinitions([...defStates.values()]));
}

export async function userDictionaryEntriesByGraph(proxy: AbstractWorkerProxy, store: AdminStore, graphs: string[]) {
  const dictionaryEntries: Record<string, Record<string, UserDefinitionType>> = {};
  const userSystemDictIds = store.getState().userData.user.translationProviders;
  const userDicts = Object.keys(store.getState().dictionary).filter((x) => !userSystemDictIds.includes(x));
  for (const dictionaryId of userDicts) {
    const userDefinitions = await proxy.sendMessagePromise<Record<string, UserDefinitionType>>({
      source: DATA_SOURCE,
      type: "getDictionaryEntriesByGraph",
      value: { dictionaryId, graphs },
    });
    dictionaryEntries[dictionaryId] = userDefinitions;
  }
  return dictionaryEntries;
}

export async function userDictionaryEntries(proxy: AbstractWorkerProxy, store: AdminStore) {
  const dictionaryEntries: Record<string, Record<string, UserDefinitionType>> = {};
  const userSystemDictIds = store.getState().userData.user.translationProviders;
  const userDicts = Object.keys(store.getState().dictionary).filter((x) => !userSystemDictIds.includes(x));
  for (const dictionaryId of userDicts) {
    const userDefinitions = await proxy.sendMessagePromise<Record<string, UserDefinitionType>>({
      source: DATA_SOURCE,
      type: "getDictionaryEntries",
      value: { dictionaryId },
    });
    dictionaryEntries[dictionaryId] = userDefinitions;
  }
  return dictionaryEntries;
}

export async function refreshDictionaries(store: AdminStore, proxy: AbstractWorkerProxy, fromLang: SystemLanguage) {
  const dictionaries = await proxy.sendMessagePromise<UserDictionary[]>({
    source: DATA_SOURCE,
    type: "getAllFromDB",
    value: {
      collection: "userdictionaries",
      queryObj: {
        selector: { status: { $eq: STATUS.ACTIVE } },
      },
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
