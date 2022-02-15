import { Grid } from "@material-ui/core";
import { bin } from "d3-array";
import dayjs from "dayjs";
import { ReactElement, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import useWindowDimensions from "../hooks/WindowDimensions";
import { binnedData } from "../lib/funclib";
import { dateRange } from "../lib/libMethods";
import { ImportFirstSuccessStats } from "../lib/types";

type GraphData = {
  name: string;
  charTypes: number;
  charTokens: number;
  wordTypes: number;
  wordTokens: number;
};

export function ImportProgress({ stats }: { stats?: ImportFirstSuccessStats }): ReactElement {
  const [data, setData] = useState<GraphData[]>([]);
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
          <Line type="monotone" dataKey="charTypes" stroke={green} />
          <Line type="monotone" dataKey="charTokens" stroke={pink} />
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: blue }}>Unique words (types)</span>
              </td>
              <td>{stats.nbUniqueWords}</td>
            </tr>
            {stats.nbTotalWords !== stats.nbUniqueWords && (
              <tr>
                <td>
                  <span style={{ color: yellow }}>Total words (tokens)</span>
                </td>
                <td>{stats.nbTotalWords}</td>
              </tr>
            )}
            <tr>
              <td>
                <span style={{ color: green }}>Unique chars (types)</span>
              </td>
              <td>{stats.nbUniqueCharacters}</td>
            </tr>
            <tr>
              <td>
                <span style={{ color: pink }}>Total chars (tokens)</span>
              </td>
              <td>{stats.nbTotalCharacters}</td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : (
    <div>The stats are still being generated</div>
  );
}
