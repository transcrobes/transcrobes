import dayjs from "dayjs";
import { ReactElement, useEffect, useState } from "react";
import { GoalDocument } from "../database/Schema";
import { dateRange } from "../lib/lib";
import { CardType } from "../lib/types";

import { bin } from "d3-array";
import { useRecordContext } from "react-admin";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const DATA_SOURCE = "GoalProgress.tsx";

type HistoData = {
  name: string;
  value: number;
};

// FIXME: any
function GoalProgress(props: any): ReactElement {
  const [data, setData] = useState<HistoData[]>([]);
  const goal = useRecordContext(props) as GoalDocument;

  useEffect(() => {
    (async function () {
      const [cards, totalWords] = await window.componentsConfig.proxy.sendMessagePromise<
        [CardType[], number]
      >({
        source: DATA_SOURCE,
        type: "getFirstSuccessCards",
        value: goal,
      });
      const end = dayjs();
      const thresholds: number[] = dateRange(
        end.add(-8, "week").unix(),
        end.unix(),
        "week",
        true,
      ) as number[];
      const locData: HistoData[] = [];
      const binFunc = bin()
        .domain([0, end.unix()])
        .thresholds([0, ...thresholds]);
      const rawBins = binFunc(cards.map((c) => c.firstSuccessDate));
      let temp = 0;
      const binnedRaw = rawBins.map((v: Array<number>) => (temp += v.length));
      const binnedPercents = binnedRaw.map((b: number) => (b / totalWords) * 100);
      for (let i = 0; i < thresholds.length; i++) {
        locData.push({
          name: dayjs(thresholds[i] * 1000).format("YYYY-MM-DD"),
          value: binnedPercents[i],
        });
      }
      setData(locData);
    })();
  }, []);

  return (
    <LineChart width={500} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis tickFormatter={(tick) => `${tick}%`} name="Progress" />
      <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
    </LineChart>
  );
}

export default GoalProgress;
