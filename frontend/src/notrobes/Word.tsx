import { Box, Divider, Table, TableBody, TableHead, Typography } from "@mui/material";
import dayjs from "dayjs";
import React, { ReactElement, useEffect } from "react";
import { useTranslate } from "react-admin";
import { $enum } from "ts-enum-util";
import { useAppSelector } from "../app/hooks";
import { ThinHR } from "../components/Common";
import DefinitionGraph from "../components/DefinitionGraph";
import DefinitionTranslations from "../components/DefinitionTranslations";
import { default as DW, default as DiscoverableWord } from "../components/DiscoverableWord";
import { Frequency } from "../components/Frequency";
import Header from "../components/Header";
import PosItem from "../components/PosItem";
import PracticerInput from "../components/PracticerInput";
import RecentSentencesElement from "../components/RecentSentencesElement";
import SayIt from "../components/SayIt";
import Sound from "../components/Sound";
import SoundBox from "../components/SoundBox";
import { CARD_TYPES, getCardId, getCardType } from "../workers/rxdb/Schema";
import useDecomposition from "../hooks/useDecomposition";
import { cleanedSound, shortProviderTranslations } from "../lib/libMethods";
import {
  CardCacheType,
  CardType,
  CharacterType,
  DefinitionType,
  EMPTY_CARD,
  InputLanguage,
  PosSentences,
  SortableListElementType,
  WordModelStatsType,
} from "../lib/types";

const infoBox = {
  margin: "0.7em",
};

interface WordInfoProps {
  definition: DefinitionType;
  characters: (CharacterType | null)[];
  meaningCard: CardType | CardCacheType;
  onCardFrontUpdate: (cardId: string, frontString: string) => void;
}

function WordInfo({ definition, characters, meaningCard, onCardFrontUpdate }: WordInfoProps): ReactElement {
  const translate = useTranslate();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <>
      <div>
        <Header text={translate("screens.notrobes.card_revision_details")} />
        <Box sx={{ fontSize: "2em" }}>
          <DefinitionGraph charWidth={100} charHeight={100} characters={characters} showAnswer={true} />
        </Box>
        <Box
          sx={{
            margin: ".5em",
            fontSize: "2em",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              marginLeft: ".5em",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Sound definition={definition} fromLang={fromLang} />
            <SayIt graph={definition.graph} lang={fromLang} />
          </Box>
        </Box>
        {/*
          FIXME: Put this back, with proper editing and showing what the cards would actually look like

        <div className={classes.meaningBox}>
          <Meaning
            translationProviderOrder={???}
            editable={false}
            showSynonyms={false}
            definition={definition}
            card={meaningCard}
            onCardFrontUpdate={onCardFrontUpdate}
          />
        </div> */}
      </div>
    </>
  );
}

interface PracticerProps {
  wordId: string;
  onPractice: (wordId: string, grade: number) => void;
}

function Practicer({ wordId, onPractice }: PracticerProps): ReactElement {
  const translate = useTranslate();
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.card_actions")} />
        <div>
          <PracticerInput wordId={wordId} onPractice={onPractice} />
        </div>
      </div>
    </>
  );
}

function ExistingCards({ cards }: { cards: CardCacheType[] }): ReactElement {
  const cardsArray = [...cards.values()];
  const translate = useTranslate();
  const toLang = useAppSelector((state) => state.userData.user.toLang);
  const cardsRows = cardsArray.map((card) => {
    return (
      card && (
        <tr key={card.wordId.toString() + card.cardType.toString()}>
          <td style={{ textTransform: "capitalize" }}>{$enum(CARD_TYPES).getKeyOrThrow(card.cardType)}</td>
          <td>
            {/* FIXME: don't hardcode the localeString!!! */}
            {dayjs
              .unix(card.dueDate || 0)
              .toDate()
              .toLocaleString(toLang === "zh-Hans" ? "zh-CN" : "en-UK")}
          </td>
          <td>{card.known ? translate("ra.message.yes") : translate("ra.message.no")}</td>
        </tr>
      )
    );
  });

  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.existing_cards")} />
        <div>
          {cardsArray.length > 0 ? ( // cards is a map
            <Table
              sx={{
                width: "400px",
                textAlign: "center",
              }}
            >
              <TableHead>
                <tr>
                  <th>{translate("screens.notrobes.type")}</th>
                  <th>{translate("screens.notrobes.due_date")}</th>
                  <th>{translate("screens.notrobes.known")}</th>
                </tr>
              </TableHead>
              <TableBody>{cardsRows}</TableBody>
            </Table>
          ) : (
            <span>{translate("screens.notrobes.no_cards")}</span>
          )}
        </div>
      </div>
    </>
  );
}
function WordLists({ lists }: { lists: SortableListElementType[] }): ReactElement {
  const translate = useTranslate();
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.lists")} />
        {lists.length > 0 ? ( // cards is a map
          <Box sx={infoBox}>
            {lists.map((wl) => `${wl.name}: ${wl.position}`).reduce((prev, curr) => prev + ", " + curr)}
          </Box>
        ) : (
          <span>{translate("screens.notrobes.no_lists")}</span>
        )}
      </div>
    </>
  );
}

function cSound(def: DefinitionType | undefined, fromLang: InputLanguage): string[] | undefined {
  return def ? cleanedSound(def, fromLang) : undefined;
}

function CharacterDetails({ characters }: { characters: (CharacterType | null)[] }): ReactElement {
  const translate = useTranslate();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const [decomp, subs] = useDecomposition(
    characters
      .map((x) => x?.id)
      .filter((x) => x)
      .join(""),
  );
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.radicals")} />
        {(characters.length > 0 && (
          <div>
            {characters
              .filter((x) => x)
              .map((char, ind) => {
                const def = decomp?.get(char!.id);
                return (
                  <React.Fragment key={ind}>
                    <div>
                      <Typography
                        component="span"
                        style={{
                          margin: ".5em",
                          fontSize: "2em",
                          verticalAlign: "middle",
                        }}
                      >
                        <DW graph={char?.id} sound={cSound(def, fromLang)} /> :{" "}
                        <SoundBox index={0} sound={cSound(def, fromLang)?.join("") || ""} /> :{" "}
                        <DW graph={char?.radical} /> : {char?.decomposition}
                      </Typography>
                      <span>
                        {char?.etymology?.type
                          ? ` => Type: ${char?.etymology?.type}${
                              char?.etymology?.phonetic ? ", Phonetic: " + char?.etymology?.phonetic : ""
                            }${char?.etymology?.semantic ? ", Semantic: " + char?.etymology?.semantic : ""} ${
                              char?.etymology?.hint ? "(" + char?.etymology?.hint + ")" : ""
                            }`
                          : ""}
                      </span>
                      {def && <Box sx={{ marginLeft: "0.5em" }}>-&gt; {shortProviderTranslations(def, fromLang)}</Box>}
                      <Divider />
                    </div>
                  </React.Fragment>
                );
              })}
          </div>
        )) || <Box sx={infoBox}>{translate("screens.notrobes.no_radicals")}</Box>}
        {subs && subs?.size > 0 && (
          <>
            <Divider /> <span>{translate("widgets.subwords.title")}</span>
            <Box sx={{ marginLeft: "0.5em" }}>
              {[...subs?.values()].map((d, i) => (
                <div key={d.graph + i}>
                  <DiscoverableWord newTab graph={d.graph} sound={cleanedSound(d, fromLang)} />:{" "}
                  {cleanedSound(d, fromLang).map((s, index) => (
                    <SoundBox key={`${s}${index}`} sound={s} index={index} />
                  ))}
                  : {shortProviderTranslations(d, fromLang)}
                </div>
              ))}
            </Box>
          </>
        )}
      </div>
    </>
  );
}

function Synonyms({ definition }: { definition: DefinitionType }): ReactElement {
  const translate = useTranslate();
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.related_words")} />
        {(definition.synonyms.length > 0 && (
          <div>
            {definition.synonyms
              .filter((x) => x.values.length > 0)
              .map((result, ind) => {
                return <PosItem key={ind} item={result} discoverableWords translate={translate} />;
              })}
          </div>
        )) || <Box sx={infoBox}>{translate("screens.notrobes.no_related_words")}</Box>}
      </div>
    </>
  );
}

function WordModelStats({ wordModelStats }: { wordModelStats: WordModelStatsType }): ReactElement {
  const translate = useTranslate();
  const toLang = useAppSelector((state) => state.userData.user.toLang);
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.personal_word_stats.title")} />
        {(wordModelStats && (
          <div>
            <Box sx={infoBox}>
              <span style={{ fontWeight: "bold" }}>{translate("screens.notrobes.personal_word_stats.nb_seen")} </span>
              <span>{wordModelStats.nbSeen} </span>
            </Box>
            <Box sx={infoBox}>
              <span style={{ fontWeight: "bold" }}>{translate("screens.notrobes.personal_word_stats.last_seen")} </span>
              {/* FIXME: nasty hardcoded locale!!! */}
              <span>
                {dayjs
                  .unix(wordModelStats.lastSeen || 0)
                  .toDate()
                  .toLocaleString(toLang === "zh-Hans" ? "zh-CN" : "en-UK")}{" "}
              </span>
            </Box>
            <Box sx={infoBox}>
              <span style={{ fontWeight: "bold" }}>
                {translate("screens.notrobes.personal_word_stats.nb_seen_since_last_check")}
              </span>
              <span>{wordModelStats.nbSeenSinceLastCheck} </span>
            </Box>
            <Box sx={infoBox}>
              <span style={{ fontWeight: "bold" }}>{translate("screens.notrobes.personal_word_stats.nb_checked")}</span>
              <span>{wordModelStats.nbChecked} </span>
            </Box>
            <Box sx={infoBox}>
              <span style={{ fontWeight: "bold" }}>
                {translate("screens.notrobes.personal_word_stats.last_checked")}{" "}
              </span>
              <span>
                {dayjs
                  .unix(wordModelStats.lastChecked || 0)
                  .toDate()
                  .toLocaleString(toLang === "zh-Hans" ? "zh-CN" : "en-UK")}{" "}
              </span>
            </Box>
          </div>
        )) || <Box sx={infoBox}>{translate("screens.notrobes.personal_word_stats.no_word_stats_found")}</Box>}
      </div>
    </>
  );
}

function ProviderTranslations({
  definition,
  translationProviderOrder,
}: {
  definition: DefinitionType;
  translationProviderOrder: Record<string, number>;
}): ReactElement {
  const translate = useTranslate();
  return (
    <>
      <ThinHR />
      <Header text={translate("screens.notrobes.entry_definitions")} />
      <DefinitionTranslations definition={definition} translationProviderOrder={translationProviderOrder} />
    </>
  );
}

function WordMetadata({ definition }: { definition: DefinitionType }): ReactElement {
  const translate = useTranslate();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.metadata")} />
        {fromLang === "zh-Hans" && (
          <Box sx={infoBox}>
            <Typography variant="body1" component="span" style={{ fontWeight: "bold" }}>
              HSK:
            </Typography>
            <span>
              {definition.hsk?.levels && definition.hsk.levels.length > 0
                ? definition.hsk.levels.join(", ")
                : "Not in the HSK"}
            </span>
          </Box>
        )}
        <Box sx={infoBox}>
          <Frequency frequency={definition.frequency} />
        </Box>
      </div>
    </>
  );
}

interface WordProps {
  definition: DefinitionType;
  cards: CardCacheType[];
  wordModelStats: WordModelStatsType;
  recentPosSentences: PosSentences | null;
  lists: SortableListElementType[];
  characters: (CharacterType | null)[];
  translationProviderOrder: Record<string, number>;
  onPractice: (wordId: string, grade: number) => void;
  onDeleteRecent: (modelId: number | bigint) => void;
  onCardFrontUpdate: (cardId: string, frontString: string) => void;
}

function Word({
  definition,
  cards,
  wordModelStats,
  recentPosSentences,
  lists,
  characters,
  translationProviderOrder,
  onDeleteRecent,
  onPractice,
  onCardFrontUpdate,
}: WordProps): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    definition && (
      <div>
        <WordInfo
          definition={definition}
          characters={characters}
          meaningCard={
            (cards && cards.filter((c) => c.cardType === CARD_TYPES.MEANING)[0]) || {
              ...EMPTY_CARD,
              id: getCardId(definition.id, CARD_TYPES.MEANING.toString()),
            }
          }
          onCardFrontUpdate={onCardFrontUpdate}
        />
        <Practicer wordId={definition.id} onPractice={onPractice} />
        <ExistingCards cards={cards} />
        {fromLang === "zh-Hans" && <CharacterDetails characters={characters} />}
        <WordLists lists={lists} />
        <RecentSentencesElement recentPosSentences={recentPosSentences} onDelete={onDeleteRecent} sameTab />
        <WordMetadata definition={definition} />
        <ProviderTranslations definition={definition} translationProviderOrder={translationProviderOrder} />
        <Synonyms definition={definition} />
        <WordModelStats wordModelStats={wordModelStats} />
      </div>
    )
  );
}

export default Word;
