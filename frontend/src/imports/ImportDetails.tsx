import { ReactElement } from "react";
import { useRecordContext, useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { hasCharacters } from "../lib/funclib";
import { Import, ImportAnalysis } from "../lib/types";

export default function ImportDetails(): ReactElement {
  const theImport = useRecordContext<Import>();
  const analysis: ImportAnalysis = JSON.parse(theImport.analysis);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const translate = useTranslate();
  let nbTotalCharacters = 0;
  let nbUniqueWords = 0;
  let nbTotalWords = 0;
  let allChars = "";
  for (const [nbOccurances, wordList] of Object.entries(analysis.vocabulary.buckets)) {
    nbTotalWords += parseInt(nbOccurances) * wordList.length;
    nbUniqueWords += wordList.length;
    nbTotalCharacters += parseInt(nbOccurances) * wordList.join("").length;
    allChars += (wordList as string[]).join("");
  }
  const nbUniqueCharacters = new Set([...allChars]).size;

  // total grammatical structures found
  // grammatical structures found per level

  return (
    <table>
      {hasCharacters(fromLang) && (
        <>
          <tr>
            <td>{translate("stats.content_progress.chars_types")}</td>
            <td>{nbUniqueCharacters}</td>
          </tr>
          <tr>
            <td>{translate("stats.content_progress.chars_tokens")}</td>
            <td>{nbTotalCharacters}</td>
          </tr>
        </>
      )}
      <tr>
        <td>{translate("stats.content_progress.words_types")}</td>
        <td>{nbUniqueWords}</td>
      </tr>
      <tr>
        <td>{translate("stats.content_progress.words_tokens")}</td>
        <td>{nbTotalWords}</td>
      </tr>
      <tr>
        <td>{translate("stats.content_progress.grammar_patterns")}</td>
        <td>{translate("general.coming_soon")}</td>
      </tr>
    </table>
  );
}
