import GoalIcon from "@mui/icons-material/TrackChanges";
import { Box, Button, Grid, LinearProgress, Link } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { useStore, useTranslate } from "react-admin";
import { platformHelper } from "../app/createStore";
import { Goal, STATUS } from "../lib/types";

type GoalPercent = {
  name: string;
  goalId: string;
  listId: string;
  percent: number;
};

export default function GoalsWidget(): ReactElement {
  const [goals, setGoals] = useState<GoalPercent[]>();
  const translate = useTranslate();
  const [includeNonDict] = useStore("preferences.includeNonDict", false);
  const [includeIgnored] = useStore("preferences.includeIgnored", false);
  useEffect(() => {
    (async function () {
      const locgoals: Goal[] = await platformHelper.getAllFromDB({
        collection: "goals",
        queryObj: {
          selector: { status: { $eq: STATUS.ACTIVE } },
        },
      });
      const listIds = locgoals.map((x) => x.userList.toString());
      const listInfos = await platformHelper.getListKnownPercentages({ listIds, includeNonDict, includeIgnored });
      const goalPercents: GoalPercent[] = [];
      for (const goal of locgoals) {
        const all = listInfos[goal.userList.toString()];
        if (all) {
          goalPercents.push({
            name: goal.title,
            goalId: goal.id.toString(),
            listId: goal.userList.toString(),
            percent: (all.known / all.total) * 100,
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
    percent: number;
  };

  function FormRow({ name, goalId, percent }: RowProps) {
    return (
      <>
        <Grid item xs={4} md={2} key={goalId + "name"}>
          <Link href={`#/goals/${goalId}/show`} sx={{ textDecoration: "none" }}>
            {name}
          </Link>
        </Grid>
        <Grid item xs={6} md={4} key={goalId + "progress"}>
          <Link href={`#/goals/${goalId}/show`}>
            <LinearProgress
              color="success"
              sx={{
                height: "10px",
                borderRadius: "5px",
                margin: "0 5px",
              }}
              variant="determinate"
              value={percent}
            />
          </Link>
        </Grid>
        <Grid item xs={2} md={6} key={goalId + "percent"}>
          <Link href={`#/goals/${goalId}/show`} sx={{ textDecoration: "none" }}>
            {percent.toFixed(2)}%
          </Link>
        </Grid>
      </>
    );
  }
  return (
    <Box sx={{ padding: { xs: "5px", md: "20px" } }}>
      <Grid
        container
        alignContent="center"
        alignItems="center"
        justifyContent="flex-start"
        sx={{ padding: { xs: "4px", md: "12px" } }}
      >
        {goals?.map((x) => (
          <FormRow key={x.goalId} name={x.name} goalId={x.goalId} percent={x.percent} />
        ))}
      </Grid>
      {goals?.length === 0 && (
        <Link href={`#/goals`} sx={{ textDecoration: "none" }}>
          <Button startIcon={<GoalIcon />}>{translate("resources.goals.create_goals_now")}</Button>
        </Link>
      )}
      {!goals && <Box>{translate("resources.goals.percents_loading")}</Box>}
    </Box>
  );
}
