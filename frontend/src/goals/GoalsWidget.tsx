import { Box, Button, Grid, Link } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { GoalDocument } from "../database/Schema";
import { ComponentsConfig } from "../lib/complexTypes";
import { SerialisableDayCardWords, STATUS, WordlistType } from "../lib/types";
import GoalIcon from "@mui/icons-material/TrackChanges";

interface Props {
  config: ComponentsConfig;
  inited: boolean;
}
const DATA_SOURCE = "GoalsWidget.tsx";

type GoalPercent = {
  name: string;
  goalId: string;
  listId: string;
  percent: number;
};

export default function GoalsWidget({ config, inited }: Props): ReactElement {
  const [goals, setGoals] = useState<GoalPercent[]>([]);

  useEffect(() => {
    (async function () {
      if (!inited) return;
      const userWords = await config.proxy.sendMessagePromise<SerialisableDayCardWords>({
        source: DATA_SOURCE,
        type: "getSerialisableCardWords",
        value: {},
      });

      const locgoals: GoalDocument[] = await config.proxy.sendMessagePromise<GoalDocument[]>({
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
      goalPercents.sort((a, b) => a.name.localeCompare(b.name));
      // or by percent
      // goalPercents.sort((a, b) => a.percent - b.percent);
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
          <Link href={`#/goals/${goalId}/show`} sx={{ textDecoration: "none" }}>
            {name}
          </Link>
        </Grid>
        <Grid item>
          <Link href={`#/goals/${goalId}/show`}>
            <progress id={goalId} value={percent} max="100">
              {percent}%
            </progress>
          </Link>
        </Grid>
        <Grid item>
          <Link href={`#/goals/${goalId}/show`} sx={{ textDecoration: "none" }}>
            {percent}%
          </Link>
        </Grid>
      </>
    );
  }
  return (
    <Box sx={{ padding: "20px" }}>
      {goals.map((x) => (
        <Grid key={x.goalId} container justifyContent="flex-start" spacing={2}>
          <FormRow name={x.name} goalId={x.goalId} percent={x.percent.toFixed(2)} />
        </Grid>
      ))}
      {goals.length === 0 && (
        <Link href={`#/goals`} sx={{ textDecoration: "none" }}>
          <Button startIcon={<GoalIcon />}>Create Goals now</Button>
        </Link>
      )}
    </Box>
  );
}
