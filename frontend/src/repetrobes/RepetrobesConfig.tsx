import { FormControl, FormControlLabel, Switch, TextField, Typography, useTheme } from "@mui/material";
import dayjs from "dayjs";
import _ from "lodash";
import { ChangeEvent, ReactElement } from "react";
import { useTranslate } from "react-admin";
import Select, { StylesConfig } from "react-select";
import { makeStyles } from "tss-react/mui";
import { useAppSelector } from "../app/hooks";
import DictionaryChooser from "../components/DictionaryChooser";
import TCCheckbox from "../components/TCCheckbox";
import WordOrderSelector from "../components/WordOrderSelector";
import { hasCharacters, isAlphabetic, validInt } from "../lib/funclib";
import { RepetrobesActivityConfigType, SelectableListElementType, WordOrdering } from "../lib/types";

interface Props {
  activityConfig: RepetrobesActivityConfigType;
  onConfigChange: (activityConfig: RepetrobesActivityConfigType) => void;
}

const useStyles = makeStyles()({
  checkbox: { padding: "0.2em 0.5em" },
  multiselect: {
    padding: "0.4em",
  },
  select: {
    display: "flex",
    justifyContent: "center",
    padding: "0.4em",
  },
  textbox: { display: "flex", justifyContent: "space-between", padding: "0.4em" },
  wordSelection: { display: "flex", justifyContent: "flex-start", padding: "0.4em" },
  rowItem: { paddingRight: "8px" },
  row: {
    border: "solid",
    display: "flex",
    justifyContent: "space-between",
    padding: "4px",
    margin: "4px",
  },
});

export default function RepetrobesConfig({ activityConfig, onConfigChange }: Props): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
  const theme = useTheme();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const colourStyles: StylesConfig = {
    control: (styles) => ({ ...styles, backgroundColor: theme.palette.background.default }),
    menu: (styles) => ({ ...styles, backgroundColor: theme.palette.background.default, zIndex: 2 }),
  };
  console.log("RepetrobesConfig activityConfig", activityConfig);

  function handleWordListsChange(sls: any) {
    // FIXME: this is SUPER nasty but see
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/32553
    // I am not intelligent enough to know what I need to do here...
    const selectedLists = sls as any[];
    const selectedMap = new Map(selectedLists.map((x) => [x.value, x]));
    const newWordLists = _.cloneDeep(activityConfig.wordLists || []);
    for (const wordList of newWordLists) {
      wordList.selected = selectedMap.has(wordList.value);
    }
    onConfigChange({ ...activityConfig, wordLists: newWordLists });
  }

  function handleOrderingChange(ordering: WordOrdering) {
    onConfigChange({ ...activityConfig, newCardOrdering: ordering });
  }

  function handleCardTypesChange(sts: any) {
    // FIXME: this is SUPER nasty but see
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/32553
    // I am not intelligent enough to know what I need to do here...
    const selectedTypes = sts as any[];
    const selectedMap = new Map(selectedTypes.map((x) => [x.value, x]));
    const newCardTypes = _.cloneDeep(activityConfig.activeCardTypes || []);
    for (const cardType of newCardTypes) {
      cardType.selected = selectedMap.has(cardType.value);
    }
    onConfigChange({ ...activityConfig, activeCardTypes: newCardTypes });
  }

  function handleDayStartsHourChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dayStartsHour = parseInt(e.target.value);
    const todayStarts = (
      new Date().getHours() < dayStartsHour ? dayjs().startOf("day").subtract(1, "day") : dayjs().startOf("day")
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
  function handleSystemWordSelectionChange(event: ChangeEvent<HTMLInputElement>, checked: boolean): void {
    onConfigChange({ ...activityConfig, systemWordSelection: !checked });
  }
  function translated_card_types(activeCardTypes?: SelectableListElementType[]): SelectableListElementType[] {
    return (
      activeCardTypes?.map((x) => ({
        value: x.value,
        label: translate(x.label),
        selected: x.selected,
      })) || []
    );
  }
  return (
    <div>
      <div className={classes.multiselect}>
        <Typography>{translate("screens.repetrobes.config.active_card_types")}</Typography>
        <Select
          styles={colourStyles}
          onChange={handleCardTypesChange}
          defaultValue={translated_card_types(activityConfig.activeCardTypes).filter((x) => x.selected)}
          isMulti
          name="activeCardTypes"
          options={translated_card_types(activityConfig.activeCardTypes)}
        />
      </div>
      {isAlphabetic(fromLang) ? (
        <TCCheckbox
          name="showL2LengthHint"
          className={classes.checkbox}
          label={translate("screens.repetrobes.config.show_l2_length_hint")}
          isSelected={activityConfig.showL2LengthHint}
          onCheckboxChange={handleSimpleChange}
        />
      ) : (
        <></>
      )}
      {hasCharacters(fromLang) ? (
        <TCCheckbox
          name="showNormalFont"
          className={classes.checkbox}
          label={translate("screens.repetrobes.config.show_normal_font")}
          isSelected={activityConfig.showNormalFont}
          onCheckboxChange={handleSimpleChange}
        />
      ) : (
        <></>
      )}
      <TCCheckbox
        name="showSynonyms"
        className={classes.checkbox}
        label={translate("screens.repetrobes.config.show_synonyms")}
        isSelected={activityConfig.showSynonyms}
        onCheckboxChange={handleSimpleChange}
      />
      <TCCheckbox
        name="showProgress"
        className={classes.checkbox}
        label={translate("screens.repetrobes.config.show_daily_progress")}
        isSelected={activityConfig.showProgress}
        onCheckboxChange={handleSimpleChange}
      />
      <TCCheckbox
        name="showRecents"
        className={classes.checkbox}
        label={translate("screens.repetrobes.config.show_recents")}
        isSelected={activityConfig.showRecents}
        onCheckboxChange={handleSimpleChange}
      />
      <div className={classes.textbox}>
        <TextField
          label={translate("screens.repetrobes.config.day_starts_hour")}
          title={translate("screens.repetrobes.config.day_starts_hour")}
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
          label={translate("screens.repetrobes.config.bad_review_wait_minutes")}
          title={translate("screens.repetrobes.config.bad_review_wait_minutes")}
          type="number"
          error={!validInt(Math.round(activityConfig.badReviewWaitSecs / 60), 1, 300)}
          helperText={
            !validInt(Math.round(activityConfig.badReviewWaitSecs / 60), 1, 300) ? "Invalid number" : undefined
          }
          defaultValue={Math.round(activityConfig.badReviewWaitSecs / 60)}
          onChange={handleBadReviewWaitMinutesChange}
          name="badReviewWaitMinutes"
          variant="outlined"
        />
      </div>
      <div className={classes.textbox}>
        <TextField
          label={translate("screens.repetrobes.config.max_new_cards_per_day")}
          title={translate("screens.repetrobes.config.max_new_cards_per_day")}
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
          label={translate("screens.repetrobes.config.max_new_revisions_per_day")}
          title={translate("screens.repetrobes.config.max_new_revisions_per_day")}
          type="number"
          error={!validInt(activityConfig.maxRevisions, 0, 10000)}
          helperText={!validInt(activityConfig.maxRevisions, 0, 10000) ? "Invalid number" : undefined}
          defaultValue={activityConfig.maxRevisions}
          onChange={handleSimpleChange}
          name="maxRevisions"
          variant="outlined"
        />
      </div>
      <FormControl component="fieldset" className={classes.wordSelection}>
        <FormControlLabel
          control={<Switch checked={!activityConfig.systemWordSelection} onChange={handleSystemWordSelectionChange} />}
          label={translate("screens.repetrobes.config.manual_selection")}
        />
        {!activityConfig.systemWordSelection && (
          <>
            <div className={classes.multiselect}>
              <Typography>{translate("screens.repetrobes.config.source_wordlists")}</Typography>
              <Select
                styles={colourStyles}
                onChange={handleWordListsChange}
                defaultValue={(activityConfig.wordLists || []).filter((x) => x.selected)}
                isMulti
                name="wordLists"
                options={(activityConfig.wordLists || []).sort((a, b) => a.label.localeCompare(b.label))}
                className={classes.multiselect}
              />
            </div>
            <div className={classes.multiselect}>
              <WordOrderSelector
                className={classes.multiselect}
                onChange={handleOrderingChange}
                value={activityConfig.newCardOrdering}
                name="newCardOrdering"
                label={translate("screens.repetrobes.config.new_card_ordering")}
              />
            </div>
            <TCCheckbox
              name="onlySelectedWordListRevisions"
              className={classes.checkbox}
              label={translate("screens.repetrobes.config.filter_revisions_by_list")}
              isSelected={activityConfig.onlySelectedWordListRevisions}
              onCheckboxChange={handleSimpleChange}
            />
          </>
        )}
      </FormControl>
      <div>
        <div className={classes.multiselect}>
          <Typography>{translate("screens.repetrobes.config.preferred_meaning_provider")}</Typography>
          <DictionaryChooser
            selected={activityConfig.translationProviderOrder || {}}
            onSelectionChange={(value) => {
              onConfigChange({ ...activityConfig, translationProviderOrder: value });
            }}
          />
        </div>
      </div>
    </div>
  );
}
