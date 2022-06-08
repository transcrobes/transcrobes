import { Grid, useTheme } from "@mui/material";
import { bin } from "d3-array";
import dayjs, { ManipulateType } from "dayjs";
import { useEffect, useState } from "react";
import { useRecordContext } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import useWindowDimensions from "../hooks/WindowDimensions";
import { binnedData } from "../lib/funclib";
import { dateRange } from "../lib/libMethods";
import { ListFirstSuccessStats } from "../lib/types";

const DATA_SOURCE = "ListProgress.tsx";

type ListGraphData = {
  name: string;
  charTypes: number;
  wordTypes: number;
};

interface Props {
  yIsNumber?: boolean;
  nbPeriods?: number;
  periodType?: ManipulateType;
}

export function ListProgress({ yIsNumber = false, nbPeriods = 8, periodType = "week" }: Props) {
  const [data, setData] = useState<ListGraphData[]>([]);
  const [stats, setStats] = useState<ListFirstSuccessStats | null>();
  const obj = useRecordContext();
  const listId = obj ? ("userList" in obj ? obj.userList : obj.id) : "";
  useEffect(() => {
    (async () => {
      if (!window.componentsConfig.proxy.loaded) return;
      const locStats: ListFirstSuccessStats | null =
        await window.componentsConfig.proxy.sendMessagePromise<ListFirstSuccessStats | null>({
          source: DATA_SOURCE,
          type: "getFirstSuccessStatsForList",
          value: listId,
        });
      setStats(locStats);
      if (!locStats) return;
      const periods: ManipulateType[] = ["month", "week", "day"];
      let currentPeriod = periods.findIndex((value) => value === periodType);
      if (currentPeriod < 0) {
        currentPeriod = 0;
      }
      const firstSuccess = locStats.successWords[0];
      const end = dayjs().add(1, "day");
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

  const theme = useTheme();
  const dims = useWindowDimensions();
  return stats ? (
    <Grid container spacing={3} justifyContent="center">
      <Grid item paddingLeft="0px !important">
        <LineChart width={Math.min(dims.width - 10, 600)} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(tick) => `${tick}${yIsNumber ? "" : "%"}`} name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="wordTypes" stroke={theme.palette.primary.main} />
          <Line type="monotone" dataKey="charTypes" stroke={theme.palette.success.light} />
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: theme.palette.primary.main }}>Unique words (types)</span>
              </td>
              <td>
                <span style={{ color: theme.palette.primary.main }}>{stats.nbUniqueWords}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ color: theme.palette.success.light }}>Unique chars (types)</span>
              </td>
              <td>
                <span style={{ color: theme.palette.success.light }}>{stats.nbUniqueCharacters}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : stats === null ? (
    <div>There are no list stats available</div>
  ) : (
    <div>The stats are still being generated</div>
  );
}
