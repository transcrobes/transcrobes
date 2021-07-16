import { Grid } from "@material-ui/core";
import { ReactElement, useEffect, useState } from "react";
import { GoalDocument } from "../database/Schema";
import { DayCardWords, STATUS, WordlistType } from "../lib/types";
import { ComponentsConfig } from "../lib/complexTypes";

interface Props {
  config: ComponentsConfig;
}
const DATA_SOURCE = "GoalsWidget.tsx";

type GoalPercent = {
  name: string;
  goalId: string;
  listId: string;
  percent: number;
};

export default function GoalsWidget({ config }: Props): ReactElement {
  const [goals, setGoals] = useState<GoalPercent[]>([]);

  useEffect(() => {
    (async function () {
      const userWords = await config.proxy.sendMessagePromise<DayCardWords>({
        source: DATA_SOURCE,
        type: "getCardWords",
        value: {},
      });
      const locgoals = await config.proxy.sendMessagePromise<GoalDocument[]>({
        source: DATA_SOURCE,
        type: "getAllFromDB",
        value: {
          collection: "goals",
          queryObj: {
            selector: { status: { $eq: STATUS.ACTIVE } },
          },
        },
      });

      const lists: WordlistType[] = await config.proxy.sendMessagePromise<WordlistType[]>({
        source: DATA_SOURCE,
        type: "getAllFromDB",
        value: {
          collection: "wordlists",
        },
      });

      const mylists = new Map<string, string[]>(lists.map((x) => [x.id, x.wordIds]));
      const knownWordIds = new Set<string>(Object.keys(userWords.knownWordIdsCounter));
      const goalPercents: GoalPercent[] = [];

      for (const goal of locgoals) {
        const all = mylists.get(goal.userList.toString());
        if (all) {
          const goalKnown = all.filter((x) => knownWordIds.has(x));
          goalPercents.push({
            name: goal.title,
            goalId: goal.id.toString(),
            listId: goal.userList.toString(),
            percent: (goalKnown.length / all.length) * 100,
          });
        }
      }
      setGoals(goalPercents);
    })();
  }, []);

  type RowProps = {
    name: string;
    goalId: string;
    percent: string;
  };

  function FormRow({ name, goalId, percent }: RowProps) {
    return (
      <>
        <Grid item>
          <div>{name}</div>
        </Grid>
        <Grid item>
          <div>
            <progress id={goalId} value={percent} max="100">
              {percent}%
            </progress>
          </div>
        </Grid>
        <Grid item>
          <div>{percent}%</div>
        </Grid>
      </>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {goals.map((x) => (
        <Grid key={x.goalId} container justifyContent="flex-start" spacing={2}>
          <FormRow name={x.name} goalId={x.goalId} percent={x.percent.toFixed(2)} />
        </Grid>
      ))}
    </div>
  );
}
