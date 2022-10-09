import { List, ListItem, Paper } from "@mui/material";
import React from "react";
import { withStyles } from "tss-react/mui";

export type TAutocompleteItem = {
  keys: string[];
  value: any;
  content: string | JSX.Element;
};

interface TAutocompleteProps {
  items: TAutocompleteItem[];
  top: number;
  left: number;
  selectedIndex: number;
  onClick: (selectedIndex: number) => void;
  classes?: Partial<Record<"container" | "item", string>>;
}

const Autocomplete = ({
  classes,
  items,
  top,
  left,
  selectedIndex,
  onClick,
}: TAutocompleteProps) => {
  if (!items.length) {
    return null;
  }
  return (
    <Paper
      className={classes!.container}
      style={{
        top: top,
        left: left,
      }}
    >
      <List dense={true}>
        {items.map((item, index) => (
          <ListItem
            key={index}
            className={classes!.item}
            selected={index === selectedIndex}
            onClick={() => onClick(index)}
          >
            {item.content}
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default withStyles(Autocomplete, {
  container: {
    minWidth: "200px",
    position: "absolute",
    zIndex: 10,
  },
  item: {
    cursor: "pointer",
  },
});
