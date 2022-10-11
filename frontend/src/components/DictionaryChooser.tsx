import { Box } from "@mui/system";
import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableLocation,
  NotDraggingStyle,
  DraggingStyle,
} from "@hello-pangea/dnd";
import { useAppSelector } from "../app/hooks";
import { reorderArray } from "../lib/funclib";
import { DNDItemType } from "../lib/types";
import { useTranslate } from "react-admin";

/**
 * Moves an item from one list to another list.
 */
function move(
  source: DNDItemType[],
  destination: DNDItemType[],
  droppableSource: DraggableLocation,
  droppableDestination: DraggableLocation,
) {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  const result: Record<string, DNDItemType[]> = {};
  result[droppableSource.droppableId] = sourceClone;
  result[droppableDestination.droppableId] = destClone;

  return result;
}

const grid = 8;

function getItemStyle(isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined) {
  return {
    // some basic styles to make the items look a bit nicer
    userSelect: "none" as const,
    padding: grid * 2,
    margin: `0 0 ${grid}px 0`,

    // change background colour if dragging
    background: isDragging ? "lightgreen" : "grey",

    // styles we need to apply on draggables
    ...draggableStyle,
  };
}

function getListStyle(isDraggingOver: boolean) {
  return {
    background: isDraggingOver ? "lightblue" : "lightgrey",
    padding: grid,
    width: "100%",
  };
}

interface Props {
  selected: Record<string, number>;
  onSelectionChange: (selected: Record<string, number>) => void;
}
export default function DictionaryChooser({ selected, onSelectionChange }: Props) {
  const [state, setState] = useState<DNDItemType[][]>([[], []]);
  const translate = useTranslate();

  const dictionaries = useAppSelector((state) => state.dictionary);
  useEffect(() => {
    const newSelected: DNDItemType[] = [];
    const newUnselected: DNDItemType[] = [];
    const dicCopy = { ...dictionaries };
    for (const prov of Object.keys(selected)) {
      newSelected.push({ id: prov, name: dictionaries[prov] });
      delete dicCopy[prov];
    }
    for (const [id, name] of Object.entries(dicCopy)) {
      newUnselected.push({ id, name });
    }
    setState([newSelected, newUnselected]);
  }, [selected]);

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;

    // dropped outside the list
    if (!destination) {
      return;
    }
    const sInd = +source.droppableId;
    const dInd = +destination.droppableId;

    const newState = [...state];
    if (sInd === dInd) {
      const items = reorderArray(state[sInd], source.index, destination.index);
      newState[sInd] = items;
    } else {
      const result = move(state[sInd], state[dInd], source, destination);
      newState[sInd] = result[sInd];
      newState[dInd] = result[dInd];
    }
    setState(newState);
    const newval = newState[0].reduce((acc, next, ind) => ({ ...acc, [next.id]: ind }), {} as Record<string, number>);
    onSelectionChange(newval);
  }

  return (
    <div>
      <div style={{ display: "flex" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {state.map((el, ind) => (
            <Droppable key={ind} droppableId={`${ind}`}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} style={getListStyle(snapshot.isDraggingOver)} {...provided.droppableProps}>
                  {ind === 0 ? (
                    <Box sx={{ margin: "0.3em" }}>{translate("widgets.dictionary_provider.selected")}</Box>
                  ) : (
                    <Box sx={{ margin: "0.3em" }}>{translate("widgets.dictionary_provider.unselected")}</Box>
                  )}
                  {el.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-around",
                            }}
                          >
                            {item.name}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}
