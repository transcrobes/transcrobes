import dayjs from "dayjs";
import { ReactElement, useEffect, useState } from "react";
import { bin } from "d3-array";
import { useRecordContext } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Grid } from "@material-ui/core";

import { dateRange } from "../lib/lib";
import { ImportFirstSuccessStats } from "../lib/types";
import { binnedData } from "../lib/funclib";

const DATA_SOURCE = "GoalProgress.tsx";

type GraphData = {
  name: string;
  charTypes: number;
  charTokens: number;
  wordTypes: number;
  wordTokens: number;
};

// FIXME: any
export function ImportProgress(props: any): ReactElement {
  const [data, setData] = useState<GraphData[]>([]);
  const [stats, setStats] = useState<ImportFirstSuccessStats>();
  const obj = useRecordContext(props);
  const importId = "theImport" in obj ? obj.theImport : obj.id;

  // FIXME: currently the word tokens data are only shown if
  // stats && stats.nbTotalWords !== stats.nbUniqueWords but we still calculate them
  // This is wasteful

  useEffect(() => {
    (async function () {
      const locStats: ImportFirstSuccessStats =
        await window.componentsConfig.proxy.sendMessagePromise<ImportFirstSuccessStats>({
          source: DATA_SOURCE,
          type: "getFirstSuccessStatsForImport",
          value: importId,
        });
      if (!locStats) return;

      setStats(locStats);
      const end = dayjs();
      const thresholds: number[] = dateRange(
        end.add(-8, "week").unix(),
        end.unix(),
        "week",
        true,
      ) as number[];

      const binFunc = bin()
        .domain([0, end.unix()])
        .thresholds([0, ...thresholds]);
      const wordDataTypes = binnedData(
        binFunc,
        thresholds,
        locStats.successWords.map((fs) => ({ firstSuccess: fs.firstSuccess, nbOccurrences: 1 })),
        locStats.nbUniqueWords,
      );
      const wordDataTokens = binnedData(
        binFunc,
        thresholds,
        locStats.successWords,
        locStats.nbTotalWords,
      );
      const charDataTypes = binnedData(
        binFunc,
        thresholds,
        locStats.successChars.map((fs) => ({ firstSuccess: fs.firstSuccess, nbOccurrences: 1 })),
        locStats.nbUniqueCharacters,
      );
      const charDataTokens = binnedData(
        binFunc,
        thresholds,
        locStats.successChars,
        locStats.nbTotalCharacters,
      );
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
  }, []);

  const blue = "#8884d8";
  const yellow = "#fcba03";
  const green = "#2cfc03";
  const pink = "#f803fc";

  return stats ? (
    <Grid container alignItems="center" spacing={3}>
      <Grid item>
        <LineChart width={500} height={300} data={data}>
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
        </table>
      </Grid>
    </Grid>
  ) : (
    <div>Stats are still being generated</div>
  );
}
