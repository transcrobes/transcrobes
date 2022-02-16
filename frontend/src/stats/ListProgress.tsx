import { Grid } from "@material-ui/core";
import { bin } from "d3-array";
import dayjs, { OpUnitType, QUnitType } from "dayjs";
import { useEffect, useState } from "react";
import { useRecordContext } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { binnedData } from "../lib/funclib";
import { dateRange } from "../lib/libMethods";
import { ListFirstSuccessStats } from "../lib/types";

const DATA_SOURCE = "UserlistProgress.tsx";

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
  const listId = obj ? ("userList" in obj ? obj.userList : obj.id) : "";
  const { yIsNumber } = props;
  const { nbPeriods = 8 } = props;
  const { periodType = "week" as QUnitType | OpUnitType } = props;
  useEffect(() => {
    (async function () {
      if (!window.componentsConfig.proxy.loaded) return;
      const locStats: ListFirstSuccessStats =
        await window.componentsConfig.proxy.sendMessagePromise<ListFirstSuccessStats>({
          source: DATA_SOURCE,
          type: "getFirstSuccessStatsForList",
          value: listId,
        });
      if (!locStats) return;
      const periods: (QUnitType | OpUnitType)[] = ["month", "week", "day"];
      let currentPeriod = periods.findIndex((value) => value === periodType);
      if (currentPeriod < 0) {
        currentPeriod = 0;
      }
      setStats(locStats);
      const firstSuccess = locStats.successWords[0];
      const end = dayjs();
      const start = Math.max(end.add(-nbPeriods, periods[currentPeriod]).unix(), firstSuccess.firstSuccess);

      let thresholds: number[] = [];
      while (thresholds.length < 3 && currentPeriod < periods.length) {
        thresholds = dateRange(start, end.unix(), periods[currentPeriod], true) as number[];
        currentPeriod++;
      }
      const binFunc = bin()
        .domain([0, end.unix()])
        .thresholds([0, ...thresholds]);
      const wordData = binnedData(binFunc, thresholds, locStats.successWords, locStats.nbUniqueWords, yIsNumber);
      const charData = binnedData(binFunc, thresholds, locStats.successChars, locStats.nbUniqueCharacters, yIsNumber);

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
  }, [window.componentsConfig.proxy.loaded]);

  const blue = "#8884d8";
  const green = "#2cfc03";
  return stats ? (
    <Grid container alignItems="center" spacing={3} justifyContent="center">
      <Grid item>
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(tick) => `${tick}${yIsNumber ? "" : "%"}`} name="Progress" />
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
    <div>The stats are still being generated</div>
  );
}
