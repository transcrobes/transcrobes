import { Grid } from "@material-ui/core";
import { bin } from "d3-array";
import dayjs, { OpUnitType, QUnitType } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { binnedDayData } from "../lib/funclib";
import { dateRange } from "../lib/libMethods";
import { DayModelStatsType } from "../lib/types";

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
const PERIODS: (QUnitType | OpUnitType)[] = ["year", "month", "week", "day"];
interface Props {
  nbPeriods?: number;
  periodType?: PeriodType;
}
type Totals = {
  nbSuccess: number;
  nbFailures: number;
};
export function DayProgressRevised({ nbPeriods = 8, periodType = 2 }: Props) {
  const [data, setData] = useState<DayRevisedGraphData[]>([]);
  const [stats, setStats] = useState<DayModelStatsType[]>();
  const [totals, setTotals] = useState<Totals>({ nbSuccess: 0, nbFailures: 0 });

  useEffect(() => {
    (async function () {
      if (!window.componentsConfig.proxy.loaded) return;
      const locStats = await window.componentsConfig.proxy.sendMessagePromise<DayModelStatsType[]>({
        source: DATA_SOURCE,
        type: "getDayStats",
      });
      if (!locStats) return;
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
  }, [window.componentsConfig.proxy.loaded]);

  const blue = "#8884d8";
  const green = "#2cfc03";
  return stats ? (
    <Grid container alignItems="center" spacing={3} justifyContent="center">
      <Grid item>
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="nbSuccess" stroke={blue} />
          <Line type="monotone" dataKey="nbFailure" stroke={green} />
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: blue }}>Nb Successes</span>
              </td>
              <td>
                <span style={{ color: blue }}>{totals.nbSuccess}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ color: green }}>Nb Re-revisions</span>
              </td>
              <td>
                <span style={{ color: green }}>{totals.nbFailures}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : (
    <div>The stats are still being generated</div>
  );
}
