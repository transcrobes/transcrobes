import { Box, Divider } from "@mui/material";
import dayjs from "dayjs";
import React, { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { $enum } from "ts-enum-util";
import { makeStyles } from "tss-react/mui";
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
import { CARD_TYPES, getCardId, getCardType } from "../database/Schema";
import useDecomposition from "../hooks/useDecomposition";
import { cleanedSound, shortProviderTranslations } from "../lib/libMethods";
import {
  CardType,
  CharacterType,
  DefinitionType,
  EMPTY_CARD,
  InputLanguage,
  PosSentences,
  SortableListElementType,
  WordModelStatsType,
} from "../lib/types";

const useStyles = makeStyles()({
  characterDetails: {
    margin: ".5em",
    fontSize: "2em",
    verticalAlign: "middle",
  },
  definitionGraph: { fontSize: "2em" },
  infoBox: {
    margin: "0.7em",
  },
  meaningBox: {
    margin: ".5em",
    fontSize: "1.5em",
    display: "flex",
    justifyContent: "center",
  },
  caps: {
    textTransform: "capitalize",
  },
  cardsTable: {
    width: "400px",
    textAlign: "center",
  },
  fieldName: {
    fontWeight: "bold",
  },
});

interface WordInfoProps {
  definition: DefinitionType;
  characters: (CharacterType | null)[];
  meaningCard: CardType;
  onCardFrontUpdate: (card: CardType) => void;
}

function WordInfo({ definition, characters, meaningCard, onCardFrontUpdate }: WordInfoProps): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <>
      <div>
        <Header text={translate("screens.notrobes.card_revision_details")} />
        <div className={classes.definitionGraph}>
          <DefinitionGraph charWidth={100} charHeight={100} characters={characters} showAnswer={true} />
        </div>
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

function ExistingCards({ cards, classes }: { cards: CardType[]; classes: any }): ReactElement {
  const cardsArray = [...cards.values()];
  const translate = useTranslate();
  const toLang = useAppSelector((state) => state.userData.user.toLang);
  const cardsRows = cardsArray.map((card) => {
    return (
      card && (
        <tr key={card.id}>
          <td className={classes.caps}>{$enum(CARD_TYPES).getKeyOrThrow(parseInt(getCardType(card)))}</td>
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
            <table className={classes.cardsTable}>
              <thead>
                <tr>
                  <th>{translate("screens.notrobes.type")}</th>
                  <th>{translate("screens.notrobes.due_date")}</th>
                  <th>{translate("screens.notrobes.known")}</th>
                </tr>
              </thead>
              <tbody>{cardsRows}</tbody>
            </table>
          ) : (
            <span>{translate("screens.notrobes.no_cards")}</span>
          )}
        </div>
      </div>
    </>
  );
}
function WordLists({ lists }: { lists: SortableListElementType[] }): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.lists")} />
        {lists.length > 0 ? ( // cards is a map
          <div className={classes.infoBox}>
            {lists.map((wl) => `${wl.name}: ${wl.position}`).reduce((prev, curr) => prev + ", " + curr)}
          </div>
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

function CharacterDetails({
  characters,
  classes,
}: {
  characters: (CharacterType | null)[];
  classes: any;
}): ReactElement {
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
                      <span className={classes.characterDetails}>
                        <DW graph={char?.id} sound={cSound(def, fromLang)} /> :{" "}
                        <SoundBox index={0} sound={cSound(def, fromLang)?.join("") || ""} /> :{" "}
                        <DW graph={char?.radical} /> : {char?.decomposition}
                      </span>
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
        )) || <div className={classes.infoBox}>{translate("screens.notrobes.no_radicals")}</div>}
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
  const { classes } = useStyles();
  const translate = useTranslate();
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.related_words")} />
        {(definition.synonyms.length > 0 && (
          <div>
            {definition.synonyms.map((result, ind) => {
              return <PosItem key={ind} item={result} discoverableWords translate={translate} />;
            })}
          </div>
        )) || <div className={classes.infoBox}>{translate("screens.notrobes.no_related_words")}</div>}
      </div>
    </>
  );
}

function WordModelStats({ wordModelStats }: { wordModelStats: WordModelStatsType }): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
  const toLang = useAppSelector((state) => state.userData.user.toLang);
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.personal_word_stats.title")} />
        {(wordModelStats && (
          <div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>{translate("screens.notrobes.personal_word_stats.nb_seen")} </span>
              <span>{wordModelStats.nbSeen} </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>{translate("screens.notrobes.personal_word_stats.last_seen")} </span>
              {/* FIXME: nasty hardcoded locale!!! */}
              <span>
                {dayjs
                  .unix(wordModelStats.lastSeen || 0)
                  .toDate()
                  .toLocaleString(toLang === "zh-Hans" ? "zh-CN" : "en-UK")}{" "}
              </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>
                {translate("screens.notrobes.personal_word_stats.nb_seen_since_last_check")}
              </span>
              <span>{wordModelStats.nbSeenSinceLastCheck} </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>{translate("screens.notrobes.personal_word_stats.nb_checked")}</span>
              <span>{wordModelStats.nbChecked} </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>
                {translate("screens.notrobes.personal_word_stats.last_checked")}{" "}
              </span>
              <span>
                {dayjs
                  .unix(wordModelStats.lastChecked || 0)
                  .toDate()
                  .toLocaleString(toLang === "zh-Hans" ? "zh-CN" : "en-UK")}{" "}
              </span>
            </div>
          </div>
        )) || (
          <div className={classes.infoBox}>{translate("screens.notrobes.personal_word_stats.no_word_stats_found")}</div>
        )}
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
  const { classes } = useStyles();
  const translate = useTranslate();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <>
      <ThinHR />
      <div>
        <Header text={translate("screens.notrobes.metadata")} />
        {fromLang === "zh-Hans" && (
          <div className={classes.infoBox}>
            <span className={classes.fieldName}>HSK: </span>
            <span>
              {definition.hsk?.levels && definition.hsk.levels.length > 0
                ? definition.hsk.levels.join(", ")
                : "Not in the HSK"}
            </span>
          </div>
        )}
        <div className={classes.infoBox}>
          <Frequency frequency={definition.frequency} />
        </div>
      </div>
    </>
  );
}

interface WordProps {
  definition: DefinitionType;
  cards: CardType[];
  wordModelStats: WordModelStatsType;
  recentPosSentences: PosSentences | null;
  lists: SortableListElementType[];
  characters: (CharacterType | null)[];
  translationProviderOrder: Record<string, number>;
  onPractice: (wordId: string, grade: number) => void;
  onDeleteRecent: (modelId: number | bigint) => void;
  onCardFrontUpdate: (card: CardType) => void;
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
  const { classes } = useStyles();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    definition && (
      <div>
        <WordInfo
          definition={definition}
          characters={characters}
          meaningCard={
            (cards && cards.filter((c) => getCardType(c) === CARD_TYPES.MEANING.toString())[0]) || {
              ...EMPTY_CARD,
              id: getCardId(definition.id, CARD_TYPES.MEANING.toString()),
            }
          }
          onCardFrontUpdate={onCardFrontUpdate}
        />
        <Practicer wordId={definition.id} onPractice={onPractice} />
        <ExistingCards cards={cards} classes={classes} />
        {fromLang === "zh-Hans" && <CharacterDetails characters={characters} classes={classes} />}
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
