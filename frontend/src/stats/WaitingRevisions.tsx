import { Grid, useTheme } from "@mui/material";
import { bin } from "d3-array";
import dayjs, { ManipulateType } from "dayjs";
import { useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import useWindowDimensions from "../hooks/WindowDimensions";
import { binnedData } from "../lib/funclib";
import { dateRange } from "../lib/libMethods";
import { CardType } from "../lib/types";

const DATA_SOURCE = "WaitingRevisions.tsx";

type ListGraphData = {
  name: string;
  wordTypes: number;
};

interface Props {
  yIsNumber?: boolean;
  nbPeriods?: number;
  periodType?: ManipulateType;
  studentId?: number;
}

export function WaitingRevisions({ studentId, yIsNumber = true, periodType = "week" }: Props) {
  const [data, setData] = useState<ListGraphData[]>([]);
  const [revisions, setRevisions] = useState<CardType[]>([]);
  const translate = useTranslate();
  useEffect(() => {
    (async () => {
      if (!window.componentsConfig.proxy.loaded) return;
      const revs: CardType[] = await window.componentsConfig.proxy.sendMessagePromise<CardType[]>({
        source: DATA_SOURCE,
        type: "getWaitingRevisions",
      });
      setRevisions(revs);
      if (!revs || revs.length < 1) return;
      const periods: ManipulateType[] = ["month", "week", "day"];
      let currentPeriod = periods.findIndex((value) => value === periodType);
      if (currentPeriod < 0) {
        currentPeriod = 0;
      }
      const oldestRevision = revs[0];
      const end = dayjs();
      const start = oldestRevision.dueDate;

      let thresholds: number[] = [];
      while (thresholds.length < 3 && currentPeriod < periods.length) {
        thresholds = dateRange(start, end.unix(), periods[currentPeriod], true) as number[];
        currentPeriod++;
      }
      const binFunc = bin()
        .domain([0, end.unix()])
        .thresholds([0, ...thresholds]);
      const waiting = revs.map((rev) => {
        return { firstSuccess: rev.dueDate, nbOccurrences: 1 };
      });

      const wordData = binnedData(binFunc, thresholds, waiting, revs.length, yIsNumber);

      const locData: ListGraphData[] = [];
      for (let i = 0; i < wordData.length; i++) {
        locData.push({
          name: wordData[i].name,
          wordTypes: wordData[i].value,
        });
      }
      setData(locData);
    })();
  }, [window.componentsConfig.proxy.loaded]);

  const theme = useTheme();
  const dims = useWindowDimensions();
  return revisions && revisions.length > 0 ? (
    <Grid container spacing={3} justifyContent="center">
      <Grid item paddingLeft="0px !important">
        <LineChart width={Math.min(dims.width - 10, 600)} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(tick) => `${tick}${yIsNumber ? "" : "%"}`} name="Progress" />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="wordTypes" stroke={theme.palette.primary.main} />
        </LineChart>
      </Grid>
      <Grid item>
        <table style={{ borderSpacing: "0 1em" }}>
          <tbody>
            <tr>
              <td>
                <span style={{ color: theme.palette.primary.main }}>
                  {translate("screens.stats.total_revisions_waiting")}
                </span>
              </td>
              <td>{revisions.length}</td>
            </tr>
          </tbody>
        </table>
      </Grid>
    </Grid>
  ) : revisions.length === 0 ? (
    <div>{translate("screens.stats.no_revision_stats")}</div>
  ) : (
    <div>{translate("screens.stats.generating")}</div>
  );
}
