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
import { platformHelper } from "../app/createStore";

dayjs.extend(customParseFormat);

const DATA_SOURCE = "DayProgress.tsx";

type DayRevisedGraphData = {
  name: string;
  nbSuccess: number;
  nbFailure: number;
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
  studentId?: number;
}
type Totals = {
  nbSuccess: number;
  nbFailures: number;
};
export function DayProgressRevised({ nbPeriods = 8, periodType = 2, studentId }: Props) {
  const [data, setData] = useState<DayRevisedGraphData[]>([]);
  const [stats, setStats] = useState<DayModelStatsType[]>();
  const [totals, setTotals] = useState<Totals>({ nbSuccess: 0, nbFailures: 0 });
  const translate = useTranslate();

  useEffect(() => {
    (async function () {
      const locStats = await platformHelper.getDayStats({ studentId });
      setStats(locStats);
      if (!locStats || locStats.length < 1) return;

      locStats.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      const t = { nbSuccess: 0, nbFailures: 0 };
      for (const stat of locStats) {
        t.nbSuccess += stat.nbSuccess || 0;
        t.nbFailures += stat.nbFailures || 0;
      }
      setTotals(t);

      let currentPeriod = periodType;

      if (currentPeriod < 0) {
        currentPeriod = 0;
      }
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
      const successData = binnedDayData(
        binFunc,
        thresholds,
        locStats.map((stat) => {
          return { day: dayjs(stat.id, "YYYYMMDD", true).unix(), nbOccurrences: stat.nbSuccess || 0 };
        }),
      );
      const failureData = binnedDayData(
        binFunc,
        thresholds,
        locStats.map((stat) => {
          return { day: dayjs(stat.id, "YYYYMMDD", true).unix(), nbOccurrences: stat.nbFailures || 0 };
        }),
      );

      const locData: DayRevisedGraphData[] = [];
      for (let i = 0; i < successData.length; i++) {
        locData.push({
          name: successData[i].name,
          nbSuccess: successData[i].value,
          nbFailure: failureData[i].value,
        });
      }
      setData(locData);
    })();
  }, [studentId]);

  const theme = useTheme();
  const dims = useWindowDimensions();
  return stats && stats.length > 0 ? (
    <Grid container spacing={3} justifyContent="center">
      <Grid item paddingLeft="0px !important">
        <LineChart width={Math.min(dims.width - 10, 600)} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="nbSuccess" stroke={theme.palette.primary.main} />
          <Line type="monotone" dataKey="nbFailure" stroke={theme.palette.success.light} />
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: theme.palette.primary.main }}>{translate("stats.nb_successes")}</span>
              </td>
              <td>
                <span style={{ color: theme.palette.primary.main }}>{totals.nbSuccess}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ color: theme.palette.success.light }}>{translate("stats.nb_re_revisions")}</span>
              </td>
              <td>
                <span style={{ color: theme.palette.success.light }}>{totals.nbFailures}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : studentId === 0 || (stats && stats.length === 0) ? (
    <div>{translate("screens.stats.no_revised_stats")}</div>
  ) : (
    <div>{translate("screens.stats.generating")}</div>
  );
}
