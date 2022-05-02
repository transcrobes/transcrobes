import { ReactElement } from "react";
import { useRecordContext } from "react-admin";
import { Import, ImportAnalysis } from "../lib/types";

export default function ImportDetails(): ReactElement {
  const theImport = useRecordContext<Import>();
  const analysis: ImportAnalysis = JSON.parse(theImport.analysis);

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
      <tr>
        <td>Nb unique characters (types)</td>
        <td>{nbUniqueCharacters}</td>
      </tr>
      <tr>
        <td>Nb total characters (tokens)</td>
        <td>{nbTotalCharacters}</td>
      </tr>
      <tr>
        <td>Nb unique words (types)</td>
        <td>{nbUniqueWords}</td>
      </tr>
      <tr>
        <td>Nb total words (tokens)</td>
        <td>{nbTotalWords}</td>
      </tr>
      <tr>
        <td>Nb grammar patterns</td>
        <td>Coming Soon</td>
      </tr>
    </table>
  );
}
