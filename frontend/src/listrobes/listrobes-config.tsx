import { ReactElement } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import styled from "styled-components";
import "reactjs-popup/dist/index.css";
import Select from "react-select";
import TCCheckbox from "../components/TCCheckbox";
import _ from "lodash";
import { GraderConfig } from "../lib/types";

// a little function to help us with reordering the result
const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const Row = styled.div`
  border: solid;
  display: flex;
  justify-content: space-between;
  padding: 4px;
  margin: 4px;
`;

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

  const gradeOrder = graderConfig.gradeOrder;
  return (
    <div>
      <div>Taps for state</div>
      <div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="droppable">
            {(provided, _snapshot) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {gradeOrder.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <Row
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <div style={{ paddingRight: "8px" }}>{index}</div>
                        <div>{item.content}</div>
                        {item.icon}
                      </Row>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      <div>
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
          name="forceWcpm"
          label="Force word count per million ordering"
          isSelected={graderConfig.forceWcpm}
          onCheckboxChange={handleForceWcpmChange}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <label htmlFor="itemsPerPage">Items per page (1 to 250)</label>
        <input
          style={{ width: "30%" }}
          name="itemsPerPage"
          min="1"
          max="250"
          type="number"
          value={graderConfig.itemsPerPage}
          onChange={handleItemsPerPageChange}
        />
      </div>
    </div>
  );
}
