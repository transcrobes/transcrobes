import dayjs from "dayjs";
import {
  CardCacheType,
  CharacterType,
  CurrentCardInfo,
  DefinitionType,
  InputLanguage,
  RepetrobesActivityConfigType,
  SrsStatusData,
} from "../../lib/types";
import { sqlResultsToObjects } from "../common-db";
import { CARD_TYPES } from "../rxdb/Schema";
import { hasCharacters } from "../../lib/funclib";
import { execute, getCharacterDetails, getDefinitions } from "./sqldata";

const DAY_IN_S = 86400;

function getActiveIds({ activityConfig: ac }: { activityConfig: RepetrobesActivityConfigType }): [string[], number[]] {
  return [
    ac.wordLists.filter((x) => x.selected).map((x) => x.value) as string[],
    ac.activeCardTypes.filter((x) => x.selected).map((x) => parseInt(x.value)) as number[],
  ];
}

function getNewCardBaseSql(ac: RepetrobesActivityConfigType, inSelectedCardTypes: number[], selectedWLIds?: string[]) {
  const phraseIndex = inSelectedCardTypes.indexOf(CARD_TYPES.PHRASE);
  const selectedCardTypes = inSelectedCardTypes.filter((x) => x !== CARD_TYPES.PHRASE);
  const sql = `
    select def.id,
      ${selectedCardTypes
        .map((x) => `sum(case when cc1.card_type = ${x} and cc1.first_revision_date > 0 then 1 else 0 end) as ct${x}`)
        .join(", ")}
      ${
        phraseIndex >= 0
          ? `, sum(case when (cc1.card_type = ${CARD_TYPES.PHRASE} and cc1.first_revision_date > 0) or trc.id is null then 1 else 0 end) as ct${CARD_TYPES.PHRASE}`
          : ""
      }
    from definitions def
         ${
           !ac.systemWordSelection
             ? ` inner join list_words lw on def.id = lw.word_id and lw.list_id in (${selectedWLIds
                 ?.map(() => "?")
                 .join(", ")})`
             : "inner join word_model_stats wms on wms.id = def.id"
         }
         ${
           !ac.systemWordSelection && ac.newCardOrdering === "Personal"
             ? "inner join word_model_stats wms on wms.id = def.id"
             : ""
         }
    left join cards cc1 on def.id = cc1.word_id
    ${phraseIndex >= 0 ? `left join tmp_recent_sentences trc on trc.id = cc1.word_id` : ""}
    where def.id not in (select cc2.word_id from cards cc2 where cc2.last_revision_date > ${ac.todayStarts})
      ${ac.filterUnsure ? "and not def.fallback_only" : ""}
    group by def.id
    having ${inSelectedCardTypes.map((x) => `ct${x} = 0`).join(" or ")}
  `;
  return sql;
}

function getRevisionCardBaseSql(
  ac: RepetrobesActivityConfigType,
  inSelectedCardTypes: number[],
  selectedWLIds?: string[],
) {
  const phraseIndex = inSelectedCardTypes.indexOf(CARD_TYPES.PHRASE);
  const selectedCardTypes = inSelectedCardTypes.filter((x) => x !== CARD_TYPES.PHRASE);
  let typesFilter = "";
  if (selectedCardTypes.length > 0 && phraseIndex >= 0) {
    typesFilter = `and (
      cc1.card_type in (${selectedCardTypes.join(", ")})
      ${phraseIndex >= 0 ? `or (cc1.card_type = ${CARD_TYPES.PHRASE} and trc.id is not null)` : ""}
    )`;
  } else if (selectedCardTypes.length > 0) {
    typesFilter = `and cc1.card_type in (${selectedCardTypes.join(", ")})`;
  } else {
    typesFilter = `and cc1.card_type = ${CARD_TYPES.PHRASE} and trc.id is not null`;
  }

  const sql = `
    select cc1.*
    from cards cc1
    ${
      !ac.systemWordSelection && ac.onlySelectedWordListRevisions
        ? ` inner join list_words lw on cc1.word_id = lw.word_id and lw.list_id in (${selectedWLIds
            ?.map(() => "?")
            .join(", ")})`
        : ""
    }
    ${phraseIndex >= 0 ? "left join tmp_recent_sentences trc on trc.id = cc1.word_id" : ""}
    where not cc1.known
    and cc1.first_revision_date < ${ac.todayStarts} and cc1.first_revision_date > 0
    and cc1.last_revision_date < ${ac.todayStarts} and cc1.last_revision_date > 0
    and cc1.due_date < ${ac.todayStarts + DAY_IN_S}
    ${typesFilter}
    and cc1.word_id not in (select cc2.word_id from cards cc2 where cc2.last_revision_date > ${ac.todayStarts})
    `;

  return sql;
}
async function getRevisionCardSql(
  ac: RepetrobesActivityConfigType,
  inSelectedCardTypes: number[],
  selectedWLIds?: string[],
) {
  const sql = `
    select * from (
    ${getRevisionCardBaseSql(ac, inSelectedCardTypes, selectedWLIds)}
     order by cc1.due_date
    limit 10
    ) as revisions order by random() limit 1;
  `;
  const out = await execute(sql, selectedWLIds ? [selectedWLIds] : undefined);
  if ((out?.length || 0) === 0) {
    return null;
  }
  let card = sqlResultsToObjects(out[0])[0];
  return card as CardCacheType;
}

async function getRepeatCard(
  ac: RepetrobesActivityConfigType,
  inSelectedCardTypes: number[],
  selectedWLIds?: string[],
) {
  // FIXME: = make sure to to include repeat news, and not just repeat revisions!!!
  const phraseIndex = inSelectedCardTypes.indexOf(CARD_TYPES.PHRASE);
  const selectedCardTypes = inSelectedCardTypes.filter((x) => x !== CARD_TYPES.PHRASE);
  let typesFilter = "";
  if (selectedCardTypes.length > 0 && phraseIndex >= 0) {
    typesFilter = `and (
      cc1.card_type in (${selectedCardTypes.join(", ")})
      ${phraseIndex >= 0 ? `or (cc1.card_type = ${CARD_TYPES.PHRASE} and trc.id is not null)` : ""}
    )`;
  } else if (selectedCardTypes.length > 0) {
    typesFilter = `and cc1.card_type in (${selectedCardTypes.join(", ")})`;
  } else {
    typesFilter = `and cc1.card_type = ${CARD_TYPES.PHRASE} and trc.id is not null`;
  }

  const sql = `
    select cc1.*
    from cards cc1
    ${
      !ac.systemWordSelection && ac.onlySelectedWordListRevisions
        ? ` inner join list_words lw on cc1.word_id = lw.word_id and lw.list_id in (${selectedWLIds
            ?.map(() => "?")
            .join(", ")})`
        : ""
    }
    ${phraseIndex >= 0 ? "left join tmp_recent_sentences trc on trc.id = cc1.word_id" : ""}
    where cc1.last_revision_date > ${ac.todayStarts}
    and cc1.due_date < ${ac.todayStarts + DAY_IN_S}
    ${typesFilter}
    order by cc1.due_date
    `;

  const out = await execute(sql, selectedWLIds ? [selectedWLIds] : undefined);
  if ((out?.length || 0) === 0) {
    return null;
  }
  let card = sqlResultsToObjects(out[0])[0];
  return card as CardCacheType;
}

async function newCardFromConfig(
  ac: RepetrobesActivityConfigType,
  selectedCardTypes: number[],
  selectedWLIds?: string[],
) {
  const activeIds = [
    ...((ac.onlySelectedWordListRevisions && !ac.systemWordSelection && selectedWLIds) || []),
    ...selectedCardTypes,
  ];

  const baseSql = getNewCardBaseSql(ac, selectedCardTypes, selectedWLIds);
  const sql = `${baseSql}
    order by
      ${ac.systemWordSelection || ac.newCardOrdering === "Personal" ? "wms.nb_seen desc" : ""}
      ${!ac.systemWordSelection && ac.newCardOrdering === "WCPM" ? "def.wcpm desc" : ""}
      ${!ac.systemWordSelection && ac.newCardOrdering === "Natural" ? "lw.default_order" : ""}
    limit 1`;
  const out = await execute(sql, selectedWLIds ? [selectedWLIds] : undefined);
  if ((out[0]?.rows[0]?.length || 0) === 0) return null;

  const inds = out[0].rows[0].slice(1).flatMap((t, i) => (t === 0 ? i : []));
  const ind = inds[Math.floor(Math.random() * inds.length)];
  const desiredWordId = out[0].rows[0][0] as number;
  const desiredCardType = selectedCardTypes[ind];

  const cardRow = await execute(`select * from cards where word_id = ? and card_type = ?`, [
    [desiredWordId, desiredCardType],
  ]);
  if (!cardRow[0].rows?.[0]?.[0]) {
    // it's a completely new card, get all the column indices (== selectedTypes) that don't have an existing card
    // pick one of the column indices at random
    return {
      wordId: desiredWordId,
      cardType: desiredCardType,
      known: 0 as 0 | 1,
      suspended: 0 as 0 | 1,
    };
  }
  // else, we have an existing "empty" card (e.g, from listrobes or an import), return that.
  const card = sqlResultsToObjects(cardRow[0])[0];
  return card as CardCacheType;
}

async function srsStatusAvailable(
  ac: RepetrobesActivityConfigType,
  selectedCardTypes: number[],
  selectedWLIds?: string[],
  includeNonDict = false,
) {
  const activeIdsForTotals = [...((!ac.systemWordSelection && selectedWLIds) || []), ...selectedCardTypes];

  let baseSql = getNewCardBaseSql(ac, selectedCardTypes, selectedWLIds);
  let sql = `select count(0) as nb_available_new from (${baseSql})`;
  const availableNewRows = (await execute(sql, [activeIdsForTotals]))[0];
  const availableNew = sqlResultsToObjects(availableNewRows)[0];

  const nbAvailableNew = availableNew.nbAvailableNew;

  baseSql = getRevisionCardBaseSql(ac, selectedCardTypes, selectedWLIds);

  sql = `select count(distinct word_id) as nb_available_revisions from (${baseSql})`;
  const availableRevisionRows = (await execute(sql, [activeIdsForTotals]))[0];
  const availableRevisions = sqlResultsToObjects(availableRevisionRows)[0];
  const nbAvailableRevisions = availableRevisions.nbAvailableRevisions;
  return {
    nbAvailableNew,
    nbAvailableRevisions,
  };
}
async function srsStatus(ac: RepetrobesActivityConfigType, selectedCardTypes: number[], selectedWLIds?: string[]) {
  let sql = `select
    sum(case
        when cc1.first_revision_date > ${ac.todayStarts}
        and cc1.due_date > ${ac.todayStarts + DAY_IN_S}
            then 1 else 0 end) as nb_new_done,
    sum(case
        when cc1.first_revision_date > ${ac.todayStarts}
        and cc1.due_date <= ${ac.todayStarts + DAY_IN_S}
            then 1 else 0 end) as nb_new_to_repeat,
    sum(case
        when cc1.first_revision_date < ${ac.todayStarts}
        and cc1.last_revision_date > ${ac.todayStarts}
        and cc1.due_date > ${ac.todayStarts + DAY_IN_S}
            then 1 else 0 end) as nb_revisions_done,
    sum(case
        when cc1.first_revision_date < ${ac.todayStarts}
        and cc1.last_revision_date > ${ac.todayStarts}
        and cc1.due_date <= ${ac.todayStarts + DAY_IN_S}
            then 1 else 0 end) as nb_revisions_to_repeat
    from cards cc1
    ${
      !ac.systemWordSelection && ac.onlySelectedWordListRevisions
        ? ` inner join list_words lw on cc1.word_id = lw.word_id and lw.list_id in (${selectedWLIds
            ?.map(() => "?")
            .join(", ")})`
        : ""
    }
    inner join definitions def on def.id = cc1.word_id
    where not cc1.known
    and cc1.card_type in (${selectedCardTypes.map(() => "?").join(", ")})
    `;

  const activeIds = [
    ...((!ac.systemWordSelection && ac.onlySelectedWordListRevisions && selectedWLIds) || []),
    ...selectedCardTypes,
  ];
  const newCountResult = (await execute(sql, [activeIds]))[0];
  const data = sqlResultsToObjects(newCountResult)[0];

  return data;
}

export async function getPracticeCard(
  ac: RepetrobesActivityConfigType,
  fromLang: InputLanguage,
): Promise<[CurrentCardInfo | null, SrsStatusData]> {
  const [selectedWLIds, selectedCardTypes] = getActiveIds({ activityConfig: ac });
  const srsStatusData = await srsStatus(ac, selectedCardTypes, selectedWLIds);
  const srsStatusDataAvailable = await srsStatusAvailable(ac, selectedCardTypes, selectedWLIds);
  const srsStatusReturn = { ...srsStatusData, ...srsStatusDataAvailable };
  const totalRevs = srsStatusData.nbRevisionsDone + srsStatusData.nbRevisionsToRepeat;
  const totalNew = srsStatusData.nbNewDone + srsStatusData.nbNewToRepeat;

  let getNew = true;
  if (
    totalNew / totalRevs >
    Math.min(srsStatusDataAvailable.nbAvailableNew, ac.maxNew) /
      Math.min(srsStatusDataAvailable.nbAvailableRevisions, ac.maxRevisions)
  ) {
    getNew = false;
  }
  let card = await getRepeatCard(ac, selectedCardTypes, selectedWLIds);
  if (
    !card ||
    !card?.lastRevisionDate ||
    card?.lastRevisionDate >= dayjs().add(-ac.badReviewWaitSecs, "seconds").unix()
  ) {
    let noMoreNew = false;
    let newCard: CardCacheType | null = null;
    if (getNew) {
      newCard = await newCardFromConfig(ac, selectedCardTypes, selectedWLIds);
      if (!newCard) {
        noMoreNew = true;
      } else {
        card = newCard;
      }
    }
    if (!getNew || !card) {
      newCard = await getRevisionCardSql(ac, selectedCardTypes, selectedWLIds);
      if (newCard) card = newCard;
    }
    if (!card && !noMoreNew) {
      newCard = await newCardFromConfig(ac, selectedCardTypes, selectedWLIds);
      if (newCard) card = newCard;
    }
  }
  if (!card) return [null, srsStatusReturn];

  const defs = await getDefinitions({ column: "id", values: [card.wordId.toString()] });
  const definition = defs[0] as DefinitionType;
  let characters: (CharacterType | null)[] = [];
  if (hasCharacters(fromLang)) {
    characters = await getCharacterDetails(definition.graph.split(""));
  }

  return [
    {
      card,
      definition,
      characters,
    },
    srsStatusReturn,
  ];
}
