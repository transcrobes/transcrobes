import { Box, FormControlLabel, Switch, TextField, Theme, useTheme } from "@mui/material";
import _ from "lodash";
import { ReactElement } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "react-beautiful-dnd";
import Select, { StylesConfig } from "react-select";
import { makeStyles } from "tss-react/mui";
import WordOrderSelector from "../components/WordOrderSelector";
import { reorderArray, validInt } from "../lib/funclib";
import { GraderConfig, WordOrdering } from "../lib/types";
import { getColour } from "./funclib";

const useStyles = makeStyles()((theme: Theme) => ({
  typography: {
    padding: theme.spacing(2),
  },
  itemsPerPage: { display: "flex", justifyContent: "space-between", padding: "0.4em" },
  itemsPerPageInput: { width: "30%" },
  checkbox: { padding: "0.4em" },
  multiselect: { padding: "0.4em" },
  select: {
    display: "flex",
    padding: "0.4em",
    marginBottom: "0.4em",
    justifyContent: "space-between",
  },
}));

interface Props {
  graderConfig: GraderConfig;
  onConfigChange: (graderConfig: GraderConfig) => void;
}

export function ListrobesConfig({ graderConfig, onConfigChange }: Props): ReactElement {
  const theme = useTheme();
  const colourStyles: StylesConfig = {
    control: (styles) => ({ ...styles, backgroundColor: theme.palette.background.default }),
    menu: (styles) => ({ ...styles, backgroundColor: theme.palette.background.default, zIndex: 2 }),
  };

  function handleDragEnd(result: DropResult) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const gradeOrder = reorderArray(graderConfig.gradeOrder, result.source.index, result.destination.index);

    onConfigChange({ ...graderConfig, gradeOrder: gradeOrder });
  }

  function handleOrderingChange(ordering: WordOrdering) {
    onConfigChange({ ...graderConfig, itemOrdering: ordering });
  }

  // FIXME: this is SUPER nasty but see
  // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/32553
  // I am not intelligent enough to know what I need to do here...
  function handleWordListsChange(selectedListsParm: any) {
    const selectedLists = selectedListsParm as any[];
    const selectedMap = new Map(selectedLists.map((x) => [x.value, x]));
    const newWordLists = _.cloneDeep(graderConfig.wordLists);
    for (const wordList of newWordLists) {
      wordList.selected = selectedMap.has(wordList.value);
    }
    onConfigChange({ ...graderConfig, wordLists: newWordLists });
  }

  function handleItemsPerPageChange(e: React.ChangeEvent<HTMLInputElement>) {
    onConfigChange({
      ...graderConfig,
      itemsPerPage: parseInt(e.target.value, 10),
    });
  }
  function handleAdvancedChange(_e: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
    onConfigChange({
      ...graderConfig,
      isAdvanced: checked,
    });
  }
  const { classes } = useStyles();
  return (
    <div>
      <FormControlLabel
        label="Advanced mode"
        control={<Switch checked={!!graderConfig.isAdvanced} onChange={handleAdvancedChange} />}
      />

      <div>Default click order</div>
      <div className={classes.multiselect}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="droppable">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {graderConfig.gradeOrder.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                        <Box
                          sx={{
                            backgroundColor: getColour(item, theme.palette),
                            border: "solid",
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px",
                            margin: "4px",
                          }}
                        >
                          <Box sx={{ paddingRight: "8px" }}>{index}</Box>
                          <div>{item.content}</div>
                          {item.icon}
                        </Box>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      <div className={classes.multiselect}>
        Source word lists
        <Select
          styles={colourStyles}
          onChange={handleWordListsChange}
          defaultValue={graderConfig.wordLists.filter((x) => x.selected)}
          isMulti
          name="wordLists"
          options={graderConfig.wordLists.sort((a, b) => a.label.localeCompare(b.label))}
        />
      </div>
      <div className={classes.select}>
        <WordOrderSelector onChange={handleOrderingChange} value={graderConfig.itemOrdering} name="itemOrdering" />
      </div>
      <div className={classes.itemsPerPage}>
        <TextField
          label="Items per page (1 to 250)"
          title="Items per page (1 to 250)"
          type="number"
          error={!validInt(graderConfig.itemsPerPage, 0, 10000)}
          helperText={!validInt(graderConfig.itemsPerPage, 1, 250) ? "Invalid number" : undefined}
          defaultValue={graderConfig.itemsPerPage}
          onChange={handleItemsPerPageChange}
          name="itemsPerPage"
          variant="outlined"
        />
      </div>
    </div>
  );
}
