import Select from "react-select";
import "reactjs-popup/dist/index.css";
import _ from "lodash";
import dayjs from "dayjs";

import TCCheckbox from "../components/TCCheckbox";
import { RepetrobesActivityConfigType } from "../lib/types";

interface Props {
  activityConfig: RepetrobesActivityConfigType;
  onConfigChange: (activityConfig: RepetrobesActivityConfigType) => void;
}
export default function RepetrobesConfig({ activityConfig, onConfigChange }: Props) {
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
    console.debug(`handleDayStartsChange`, e.target);
    const dayStartsHour = parseInt(e.target.value);
    const todayStarts = (
      new Date().getHours() < dayStartsHour
        ? dayjs().startOf("day").subtract(1, "day")
        : dayjs().startOf("day")
    )
      .add(dayStartsHour, "hour")
      .unix();

    const update = { ...activityConfig, dayStartsHour, todayStarts };

    onConfigChange(update);
  }

  function handleSimpleChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.debug(`e handleSimpleChange`, e.target);
    const update = {
      ...activityConfig,
      [e.target.name]: e.target.hasOwnProperty("checked") ? e.target.checked : e.target.value,
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
      <div>
        Source word lists
        <Select
          onChange={handleWordListsChange}
          defaultValue={activityConfig.wordLists.filter((x) => x.selected)}
          isMulti
          name="wordLists"
          options={activityConfig.wordLists}
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </div>
      <div>
        Active card types
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
      <div>
        <TCCheckbox
          name="showSynonyms"
          label="Show meaning question L2 synonyms"
          isSelected={activityConfig.showSynonyms}
          onCheckboxChange={handleSimpleChange}
        />
      </div>
      <div>
        <TCCheckbox
          name="forceWcpm"
          label="Force word count per million ordering"
          isSelected={activityConfig.forceWcpm}
          onCheckboxChange={handleSimpleChange}
        />
      </div>
      <div>
        <TCCheckbox
          name="showL2LengthHint"
          label="Show L2 length hint"
          isSelected={activityConfig.showL2LengthHint}
          onCheckboxChange={handleSimpleChange}
        />
      </div>
      <div>
        <TCCheckbox
          name="showProgress"
          label="Show daily progress information"
          isSelected={activityConfig.showProgress}
          onCheckboxChange={handleSimpleChange}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <label htmlFor="dayStartsHour">Day start hour (0 to 23)</label>
        <input
          style={{ width: "30%", maxHeight: "2em" }}
          name="dayStartsHour"
          min="0"
          max="23"
          type="number"
          value={activityConfig.dayStartsHour}
          onChange={handleDayStartsHourChange}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <label htmlFor="badReviewWaitMinutes">Bad review wait mins (1 to 300)</label>
        <input
          style={{ width: "30%", maxHeight: "2em", minWidth: "3em" }}
          name="badReviewWaitMinutes"
          min="1"
          max="300"
          type="number"
          value={Math.round(activityConfig.badReviewWaitSecs / 60)}
          onChange={handleBadReviewWaitMinutesChange}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <label htmlFor="maxNew">Max new p/d (1 to 10000)</label>
        <input
          style={{ width: "40%", maxHeight: "2em", minWidth: "3em" }}
          name="maxNew"
          min="1"
          max="10000"
          type="number"
          value={activityConfig.maxNew}
          onChange={handleSimpleChange}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <label htmlFor="maxRevisions">Max revisions p/d (1 to 10000)</label>
        <input
          style={{ width: "40%", maxHeight: "2em", minWidth: "3em" }}
          name="maxRevisions"
          min="1"
          max="10000"
          type="number"
          value={activityConfig.maxRevisions}
          onChange={handleSimpleChange}
        />
      </div>
    </div>
  );
}
