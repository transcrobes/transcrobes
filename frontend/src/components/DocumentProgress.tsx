import { Grid } from "@mui/material";
import { bin } from "d3-array";
import dayjs from "dayjs";
import { ReactElement, useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useAppSelector } from "../app/hooks";
import useWindowDimensions from "../hooks/WindowDimensions";
import { binnedData, hasCharacters } from "../lib/funclib";
import { dateRange } from "../lib/libMethods";
import { ImportFirstSuccessStats } from "../lib/types";

type GraphData = {
  name: string;
  charTypes: number;
  charTokens: number;
  wordTypes: number;
  wordTokens: number;
};

export function DocumentProgress({ stats }: { stats?: ImportFirstSuccessStats | null }): ReactElement {
  const [data, setData] = useState<GraphData[]>([]);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const translate = useTranslate();
  // FIXME: currently the word tokens data are only shown if
  // stats && stats.nbTotalWords !== stats.nbUniqueWords but we still calculate them
  // This is wasteful
  useEffect(() => {
    (async function () {
      if (!stats) return;
      const end = dayjs();
      const thresholds: number[] = dateRange(end.add(-8, "week").unix(), end.unix(), "week", true) as number[];

      const binFunc = bin()
        .domain([0, end.unix()])
        .thresholds([0, ...thresholds]);
      const wordDataTypes = binnedData(
        binFunc,
        thresholds,
        stats.successWords.map((fs) => ({ firstSuccess: fs.firstSuccess, nbOccurrences: 1 })),
        stats.nbUniqueWords,
      );
      const wordDataTokens = binnedData(binFunc, thresholds, stats.successWords, stats.nbTotalWords);
      const charDataTypes = binnedData(
        binFunc,
        thresholds,
        stats.successChars.map((fs) => ({ firstSuccess: fs.firstSuccess, nbOccurrences: 1 })),
        stats.nbUniqueCharacters,
      );
      const charDataTokens = binnedData(binFunc, thresholds, stats.successChars, stats.nbTotalCharacters);
      const locData: GraphData[] = [];
      // FIXME: is there a better way to get the number of bins?
      for (let i = 0; i < wordDataTypes.length; i++) {
        locData.push({
          name: wordDataTypes[i].name,
          wordTypes: wordDataTypes[i].value,
          wordTokens: wordDataTokens[i].value,
          charTypes: charDataTypes[i].value,
          charTokens: charDataTokens[i].value,
        });
      }
      setData(locData);
    })();
  }, [stats]);

  const blue = "#8884d8";
  const yellow = "#fcba03";
  const green = "#2cfc03";
  const pink = "#f803fc";

  const dims = useWindowDimensions();
  return stats ? (
    <Grid container alignItems="center" spacing={3} justifyContent="center">
      <Grid item>
        <LineChart width={Math.min(dims.width - 10, 600)} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(tick) => `${tick}%`} name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="wordTypes" stroke={blue} />
          {stats && stats.nbTotalWords !== stats.nbUniqueWords && (
            <Line type="monotone" dataKey="wordTokens" stroke={yellow} />
          )}
          {hasCharacters(fromLang) && (
            <>
              <Line type="monotone" dataKey="charTypes" stroke={green} />
              <Line type="monotone" dataKey="charTokens" stroke={pink} />
            </>
          )}
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: blue }}>{translate("stats.content_progress.words_types")}</span>
              </td>
              <td>{stats.nbUniqueWords}</td>
            </tr>
            {stats.nbTotalWords !== stats.nbUniqueWords && (
              <tr>
                <td>
                  <span style={{ color: yellow }}>{translate("stats.content_progress.words_tokens")}</span>
                </td>
                <td>{stats.nbTotalWords}</td>
              </tr>
            )}
            {hasCharacters(fromLang) && (
              <>
                <tr>
                  <td>
                    <span style={{ color: green }}>{translate("stats.content_progress.chars_types")}</span>
                  </td>
                  <td>{stats.nbUniqueCharacters}</td>
                </tr>
                <tr>
                  <td>
                    <span style={{ color: pink }}>{translate("stats.content_progress.chars_tokens")}</span>
                  </td>
                  <td>{stats.nbTotalCharacters}</td>
                </tr>
              </>
            )}
            <tr>
              <td>
                <span>{translate("stats.content_progress.avg_sentence_length")}</span>
              </td>
              <td>{stats.meanSentenceLength ? stats.meanSentenceLength.toFixed(1) : "N/A"}</td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : stats === null ? (
    <div>{translate("stats.content_progress.missing_stats")}</div>
  ) : (
    <div>{translate("stats.content_progress.generating_stats")}</div>
  );
}
