import { ReactElement } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import Select from "react-select";
import _ from "lodash";
import { makeStyles, TextField, Theme } from "@material-ui/core";

import TCCheckbox from "../components/TCCheckbox";
import { GraderConfig } from "../lib/types";
import { validInt } from "../lib/funclib";

const useStyles = makeStyles((theme: Theme) => ({
  typography: {
    padding: theme.spacing(2),
  },
  rowItem: { paddingRight: "8px" },
  itemsPerPage: { display: "flex", justifyContent: "space-between", padding: "0.4em" },
  itemsPerPageInput: { width: "30%" },
  checkbox: { padding: "0.4em" },
  select: { padding: "0.4em" },
  row: {
    border: "solid",
    display: "flex",
    justifyContent: "space-between",
    padding: "4px",
    margin: "4px",
  },
}));

// a little function to help us with reordering the result
const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

interface Props {
  graderConfig: GraderConfig;
  onConfigChange: (graderConfig: GraderConfig) => void;
}

export function ListrobesConfig({ graderConfig, onConfigChange }: Props): ReactElement {
  function handleDragEnd(result: DropResult) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const gradeOrder = reorder(
      graderConfig.gradeOrder,
      result.source.index,
      result.destination.index,
    );

    onConfigChange({ ...graderConfig, gradeOrder: gradeOrder });
  }

  function handleForceWcpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    onConfigChange({ ...graderConfig, forceWcpm: e.target.checked });
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
  const classes = useStyles();
  const gradeOrder = graderConfig.gradeOrder;
  return (
    <div>
      <div>Taps for state</div>
      <div className={classes.select}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="droppable">
            {(provided, _snapshot) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {gradeOrder.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        className={classes.row}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <div className={classes.rowItem}>{index}</div>
                        <div>{item.content}</div>
                        {item.icon}
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
      <div className={classes.select}>
        Source word lists
        <Select
          onChange={handleWordListsChange}
          defaultValue={graderConfig.wordLists.filter((x) => x.selected)}
          isMulti
          name="wordLists"
          options={graderConfig.wordLists.sort((a, b) => a.label.localeCompare(b.label))}
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </div>
      <div>
        <TCCheckbox
          className={classes.checkbox}
          name="forceWcpm"
          label="Force word count per million ordering"
          isSelected={graderConfig.forceWcpm}
          onCheckboxChange={handleForceWcpmChange}
        />
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
