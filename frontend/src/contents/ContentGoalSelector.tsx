import { FormControl, FormHelperText, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import ContentValueField from "../components/ContentValueField";
import { Goal } from "../lib/types";
import { platformHelper } from "../app/createStore";

export function ContentGoalSelector({
  showResult,
  onChange,
}: {
  showResult?: boolean;
  onChange?: (event: SelectChangeEvent) => void;
}) {
  const translate = useTranslate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [userListId, setUserListId] = useState<string | undefined>(undefined);

  function onLocalChange(event: SelectChangeEvent) {
    setUserListId(event.target.value);
    if (onChange) {
      onChange(event);
    }
  }

  useEffect(() => {
    (async function () {
      const existing = await platformHelper.getAllFromDB({ collection: "goals" });
      if (existing && existing.length > 0) {
        setGoals(existing);
      }
    })();
  }, []);

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <FormControl sx={{ m: 1, minWidth: 120 }} size={showResult ? "medium" : "small"}>
        <InputLabel id="select-userlist-label">{translate("resources.contents.goals")}</InputLabel>
        <Select
          labelId="select-userlist-label"
          id="select-userlist"
          value={userListId || ""}
          label={translate("resources.contents.goals")}
          onChange={onLocalChange}
        >
          <MenuItem key={""} value="">
            <em>{translate("resources.contents.no_goal")}</em>
          </MenuItem>
          {goals.map((goal) => (
            <MenuItem key={goal.id} value={goal.userList}>
              {goal.title}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{translate("resources.contents.goal_selector")}</FormHelperText>
      </FormControl>
      {showResult && userListId ? (
        <Box sx={{ paddingLeft: "1em" }}>
          <ContentValueField key={userListId} userlistId={userListId} />
        </Box>
      ) : null}
    </Box>
  );
}
