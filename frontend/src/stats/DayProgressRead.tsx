import { Grid, useTheme } from "@mui/material";
import { bin } from "d3-array";
import dayjs, { ManipulateType } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import useWindowDimensions from "../hooks/WindowDimensions";
import { binnedDayData } from "../lib/funclib";
import { dateRange } from "../lib/libMethods";
import { DayModelStatsType } from "../lib/types";

dayjs.extend(customParseFormat);

const DATA_SOURCE = "DayProgress.tsx";

type DayGraphData = {
  name: string;
  nbSeen: number;
  nbChecked: number;
};

enum PeriodType {
  year,
  month,
  week,
  day,
}
const PERIODS: ManipulateType[] = ["year", "month", "week", "day"];
interface Props {
  nbPeriods?: number;
  periodType?: PeriodType;
}
type Totals = {
  nbSeen: number;
  nbChecked: number;
};
export function DayProgressRead({ nbPeriods = 8, periodType = 2 }: Props) {
  const [data, setData] = useState<DayGraphData[]>([]);
  const [stats, setStats] = useState<DayModelStatsType[]>();
  const [totals, setTotals] = useState<Totals>({ nbSeen: 0, nbChecked: 0 });
  const translate = useTranslate();

  useEffect(() => {
    (async function () {
      if (!window.componentsConfig.proxy.loaded) return;
      const locStats = await window.componentsConfig.proxy.sendMessagePromise<DayModelStatsType[]>({
        source: DATA_SOURCE,
        type: "getDayStats",
      });
      if (!locStats) return;
      locStats.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      const t = { nbSeen: 0, nbChecked: 0 };
      for (const stat of locStats) {
        t.nbSeen += stat.nbSeen || 0;
        t.nbChecked += stat.nbChecked || 0;
      }
      setTotals(t);
      let currentPeriod = periodType;

      if (currentPeriod < 0) {
        currentPeriod = 0;
      }
      setStats(locStats);
      const firstDay = locStats[0].id;
      const end = dayjs().add(1, "day");
      const start = Math.max(
        end.add(-nbPeriods, PERIODS[currentPeriod]).unix(),
        dayjs(firstDay, "YYYYMMDD", true).unix(),
      );

      let thresholds: number[] = [];
      while (thresholds.length < 3 && currentPeriod < PERIODS.length) {
        thresholds = dateRange(start, end.unix(), PERIODS[currentPeriod], true) as number[];
        currentPeriod++;
      }
      const binFunc = bin()
        .domain([0, end.unix()])
        .thresholds([0, ...thresholds]);
      const seenData = binnedDayData(
        binFunc,
        thresholds,
        locStats.map((stat) => {
          return { day: dayjs(stat.id, "YYYYMMDD", true).unix(), nbOccurrences: stat.nbSeen || 0 };
        }),
      );
      const checkedData = binnedDayData(
        binFunc,
        thresholds,
        locStats.map((stat) => {
          return { day: dayjs(stat.id, "YYYYMMDD", true).unix(), nbOccurrences: stat.nbChecked || 0 };
        }),
      );

      const locData: DayGraphData[] = [];
      for (let i = 0; i < seenData.length; i++) {
        locData.push({
          name: seenData[i].name,
          nbSeen: seenData[i].value,
          nbChecked: checkedData[i].value,
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
          <YAxis name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="nbSeen" stroke={theme.palette.primary.main} />
          <Line type="monotone" dataKey="nbChecked" stroke={theme.palette.success.light} />
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: theme.palette.primary.main }}>{translate("stats.nb_seen")}</span>
              </td>
              <td>
                <span style={{ color: theme.palette.primary.main }}>{totals.nbSeen}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ color: theme.palette.success.light }}>{translate("stats.nb_checked")}</span>
              </td>
              <td>
                <span style={{ color: theme.palette.success.light }}>{totals.nbChecked}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : (
    <div>{translate("screens.stats.generating")}</div>
  );
}
