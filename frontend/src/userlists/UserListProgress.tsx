import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { bin } from "d3-array";
import { useRecordContext } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Grid } from "@material-ui/core";

import { dateRange } from "../lib/libMethods";
import { ListFirstSuccessStats } from "../lib/types";
import { binnedData } from "../lib/funclib";

const DATA_SOURCE = "GoalProgress.tsx";

type ListGraphData = {
  name: string;
  charTypes: number;
  wordTypes: number;
};

// FIXME: any
export function UserListProgress(props: any) {
  const [data, setData] = useState<ListGraphData[]>([]);
  const [stats, setStats] = useState<ListFirstSuccessStats>();
  const obj = useRecordContext(props);
  const listId = "userList" in obj ? obj.userList : obj.id;

  useEffect(() => {
    (async function () {
      const locStats: ListFirstSuccessStats =
        await window.componentsConfig.proxy.sendMessagePromise<ListFirstSuccessStats>({
          source: DATA_SOURCE,
          type: "getFirstSuccessStatsForList",
          value: listId,
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
      const wordData = binnedData(
        binFunc,
        thresholds,
        locStats.successWords,
        locStats.nbUniqueWords,
      );
      const charData = binnedData(
        binFunc,
        thresholds,
        locStats.successChars,
        locStats.nbUniqueCharacters,
      );
      const locData: ListGraphData[] = [];
      for (let i = 0; i < wordData.length; i++) {
        locData.push({
          name: wordData[i].name,
          wordTypes: wordData[i].value,
          charTypes: charData[i].value,
        });
      }
      setData(locData);
    })();
  }, []);

  const blue = "#8884d8";
  const green = "#2cfc03";
  return stats ? (
    <Grid container alignItems="center" spacing={3} justifyContent="center">
      <Grid item>
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(tick) => `${tick}%`} name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="wordTypes" stroke={blue} />
          <Line type="monotone" dataKey="charTypes" stroke={green} />
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
            <tr>
              <td>
                <span style={{ color: green }}>Unique chars (types)</span>
              </td>
              <td>{stats.nbUniqueCharacters}</td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : (
    <div>Stats are still being generated</div>
  );
}
