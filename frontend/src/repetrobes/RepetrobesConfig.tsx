import { ReactElement } from "react";
import Select from "react-select";
// import "reactjs-popup/dist/index.css";
import _ from "lodash";
import dayjs from "dayjs";

import TCCheckbox from "../components/TCCheckbox";
import { RepetrobesActivityConfigType } from "../lib/types";
import { makeStyles, TextField, Typography } from "@material-ui/core";
import { validInt } from "../lib/funclib";

interface Props {
  activityConfig: RepetrobesActivityConfigType;
  onConfigChange: (activityConfig: RepetrobesActivityConfigType) => void;
}

const useStyles = makeStyles({
  checkbox: { padding: "0.2em 0.5em" },
  select: { padding: "0.4em" },
  textbox: { display: "flex", justifyContent: "space-between", padding: "0.4em" },
});

export default function RepetrobesConfig({ activityConfig, onConfigChange }: Props): ReactElement {
  const classes = useStyles();

  function handleWordListsChange(sls: any) {
    // FIXME: this is SUPER nasty but see
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/32553
    // I am not intelligent enough to know what I need to do here...
    const selectedLists = sls as any[];
    const selectedMap = new Map(selectedLists.map((x) => [x.value, x]));
    const newWordLists = _.cloneDeep(activityConfig.wordLists);
    for (const wordList of newWordLists) {
      wordList.selected = selectedMap.has(wordList.value);
    }
    onConfigChange({ ...activityConfig, wordLists: newWordLists });
  }

  function handleCardTypesChange(sts: any) {
    // FIXME: this is SUPER nasty but see
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/32553
    // I am not intelligent enough to know what I need to do here...
    const selectedTypes = sts as any[];
    const selectedMap = new Map(selectedTypes.map((x) => [x.value, x]));
    const newCardTypes = _.cloneDeep(activityConfig.activeCardTypes);
    for (const cardType of newCardTypes) {
      cardType.selected = selectedMap.has(cardType.value);
    }
    onConfigChange({ ...activityConfig, activeCardTypes: newCardTypes });
  }

  function handleDayStartsHourChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dayStartsHour = parseInt(e.target.value);
    const todayStarts = (
      new Date().getHours() < dayStartsHour
        ? dayjs().startOf("day").subtract(1, "day")
        : dayjs().startOf("day")
    )
      .add(dayStartsHour, "hour")
      .unix();

    const update = {
      ...activityConfig,
      dayStartsHour,
      todayStarts,
    };

    onConfigChange(update);
  }

  function handleSimpleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const update = {
      ...activityConfig,
      [e.target.name]: Object.prototype.hasOwnProperty.call(e.target, "checked")
        ? e.target.checked
        : parseInt(e.target.value),
    };
    onConfigChange(update);
  }

  function handleBadReviewWaitMinutesChange(e: React.ChangeEvent<HTMLInputElement>) {
    onConfigChange(
      // the user inputs in minutes, we store in seconds
      { ...activityConfig, badReviewWaitSecs: parseInt(e.target.value) * 60 },
    );
  }
  return (
    <div>
      <div className={classes.select}>
        <Typography>Source word lists</Typography>
        <Select
          onChange={handleWordListsChange}
          defaultValue={activityConfig.wordLists.filter((x) => x.selected)}
          isMulti
          name="wordLists"
          options={activityConfig.wordLists.sort((a, b) => a.label.localeCompare(b.label))}
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </div>
      <div className={classes.select}>
        <Typography>Active card types</Typography>
        <Select
          onChange={handleCardTypesChange}
          defaultValue={activityConfig.activeCardTypes.filter((x) => x.selected)}
          isMulti
          name="activeCardTypes"
          options={activityConfig.activeCardTypes}
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </div>
      <TCCheckbox
        name="showSynonyms"
        className={classes.checkbox}
        label="Show meaning question L2 synonyms"
        isSelected={activityConfig.showSynonyms}
        onCheckboxChange={handleSimpleChange}
      />
      <TCCheckbox
        name="forceWcpm"
        className={classes.checkbox}
        label="Force word count per million ordering"
        isSelected={activityConfig.forceWcpm}
        onCheckboxChange={handleSimpleChange}
      />
      {/* This is really no longer useful with the character component */}
      {/* <TCCheckbox
        name="showL2LengthHint"
        className={classes.checkbox}
        label="Show L2 length hint"
        isSelected={activityConfig.showL2LengthHint}
        onCheckboxChange={handleSimpleChange}
      /> */}
      <TCCheckbox
        name="showProgress"
        className={classes.checkbox}
        label="Show daily progress information"
        isSelected={activityConfig.showProgress}
        onCheckboxChange={handleSimpleChange}
      />
      <TCCheckbox
        name="showRecents"
        className={classes.checkbox}
        label="Show recent phrases"
        isSelected={activityConfig.showRecents}
        onCheckboxChange={handleSimpleChange}
      />
      <TCCheckbox
        name="onlySelectedWordListRevisions"
        className={classes.checkbox}
        label="Filter Revisions by list"
        isSelected={activityConfig.onlySelectedWordListRevisions}
        onCheckboxChange={handleSimpleChange}
      />
      <div className={classes.textbox}>
        <TextField
          label="Day start hour (0 to 23)"
          title="Day start hour (0 to 23)"
          type="number"
          error={!validInt(activityConfig.dayStartsHour, 0, 23)}
          helperText={!validInt(activityConfig.dayStartsHour, 0, 23) ? "Invalid number" : undefined}
          defaultValue={activityConfig.dayStartsHour}
          onChange={handleDayStartsHourChange}
          name="dayStartsHour"
          variant="outlined"
        />
      </div>
      <div className={classes.textbox}>
        <TextField
          label="Bad review wait mins (1 to 300)"
          title="Bad review wait mins (1 to 300)"
          type="number"
          error={!validInt(Math.round(activityConfig.badReviewWaitSecs / 60), 1, 300)}
          helperText={
            !validInt(Math.round(activityConfig.badReviewWaitSecs / 60), 1, 300)
              ? "Invalid number"
              : undefined
          }
          defaultValue={Math.round(activityConfig.badReviewWaitSecs / 60)}
          onChange={handleBadReviewWaitMinutesChange}
          name="badReviewWaitMinutes"
          variant="outlined"
        />
      </div>
      <div className={classes.textbox}>
        <TextField
          label="Max new p/d (0 to 10000)"
          title="Max new p/d (0 to 10000)"
          type="number"
          error={!validInt(activityConfig.maxNew, 0, 10000)}
          helperText={!validInt(activityConfig.maxNew, 0, 10000) ? "Invalid number" : undefined}
          defaultValue={activityConfig.maxNew}
          onChange={handleSimpleChange}
          name="maxNew"
          variant="outlined"
        />
      </div>
      <div className={classes.textbox}>
        <TextField
          label="Max revisions p/d (0 to 10000)"
          title="Max revisions p/d (0 to 10000)"
          type="number"
          error={!validInt(activityConfig.maxRevisions, 0, 10000)}
          helperText={
            !validInt(activityConfig.maxRevisions, 0, 10000) ? "Invalid number" : undefined
          }
          defaultValue={activityConfig.maxRevisions}
          onChange={handleSimpleChange}
          name="maxRevisions"
          variant="outlined"
        />
      </div>
    </div>
  );
}
