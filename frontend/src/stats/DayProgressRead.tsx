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
const PERIODS: (QUnitType | OpUnitType)[] = ["year", "month", "week", "day"];
interface Props {
  nbPeriods?: number;
  periodType?: PeriodType;
}

export function DayProgressRead({ nbPeriods = 8, periodType = 2 }: Props) {
  const [data, setData] = useState<DayGraphData[]>([]);
  const [stats, setStats] = useState<DayModelStatsType[]>();

  useEffect(() => {
    (async function () {
      if (!window.componentsConfig.proxy.loaded) return;
      const locStats = await window.componentsConfig.proxy.sendMessagePromise<DayModelStatsType[]>({
        source: DATA_SOURCE,
        type: "getDayStats",
      });
      if (!locStats) return;
      locStats.sort((a, b) => parseInt(a.id) - parseInt(b.id));

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

  const blue = "#8884d8";
  const green = "#2cfc03";
  return stats ? (
    <Grid container alignItems="center" spacing={3} justifyContent="center">
      <Grid item>
        <LineChart width={500} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="nbSeen" stroke={blue} />
          <Line type="monotone" dataKey="nbChecked" stroke={green} />
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: blue }}>Nb Seen</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style={{ color: green }}>Nb Checked</span>
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
