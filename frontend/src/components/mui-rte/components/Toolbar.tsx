import CodeIcon from "@mui/icons-material/Code";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import HighlightIcon from "@mui/icons-material/Highlight";
import InsertLinkIcon from "@mui/icons-material/InsertLink";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import RedoIcon from "@mui/icons-material/Redo";
import SaveIcon from "@mui/icons-material/Save";
import StrikethroughIcon from "@mui/icons-material/StrikethroughS";
import TitleIcon from "@mui/icons-material/Title";
import UndoIcon from "@mui/icons-material/Undo";
import { EditorState } from "draft-js";
import React, { FunctionComponent, useEffect, useState } from "react";
import { getSelectionInfo } from "../utils";
import ToolbarButton from "./ToolbarButton";

export type TToolbarControl =
  | "title"
  | "bold"
  | "italic"
  | "underline"
  | "link"
  | "numberList"
  | "bulletList"
  | "quote"
  | "code"
  | "clear"
  | "save"
  | "media"
  | "strikethrough"
  | "highlight"
  | string;

export type TControlType = "inline" | "block" | "callback" | "atomic";

export type TToolbarButtonSize = "small" | "medium";

export type TToolbarComponentProps = {
  id: string;
  onMouseDown: (e: React.MouseEvent) => void;
  active: boolean;
  disabled: boolean;
};

export type TCustomControl = {
  id?: string;
  name: string;
  icon?: JSX.Element;
  type: TControlType;
  component?: FunctionComponent<TToolbarComponentProps>;
  inlineStyle?: React.CSSProperties;
  blockWrapper?: React.ReactElement;
  atomicComponent?: FunctionComponent;
  onClick?: (
    editorState: EditorState,
    name: string,
    anchor: HTMLElement | null
  ) => EditorState | void;
};

type TStyleType = {
  id?: string;
  name: TToolbarControl | string;
  label: string;
  style: string;
  icon?: JSX.Element;
  component?: FunctionComponent<TToolbarComponentProps>;
  type: TControlType;
  active?: boolean;
  clickFnName?: string;
};

type TToolbarProps = {
  id: string;
  editorState: EditorState;
  controls?: Array<TToolbarControl>;
  customControls?: TCustomControl[];
  onClick: (
    style: string,
    type: string,
    id: string,
    inlineMode?: boolean
  ) => void;
  inlineMode?: boolean;
  className?: string;
  disabled?: boolean;
  size?: TToolbarButtonSize;
  isActive: boolean;
};

const STYLE_TYPES: TStyleType[] = [
  {
    label: "H2",
    name: "title",
    style: "header-two",
    icon: <TitleIcon />,
    type: "block",
  },
  {
    label: "Bold",
    name: "bold",
    style: "BOLD",
    icon: <FormatBoldIcon />,
    type: "inline",
  },
  {
    label: "Italic",
    name: "italic",
    style: "ITALIC",
    icon: <FormatItalicIcon />,
    type: "inline",
  },
  {
    label: "Underline",
    name: "underline",
    style: "UNDERLINE",
    icon: <FormatUnderlinedIcon />,
    type: "inline",
  },
  {
    label: "Strikethrough",
    name: "strikethrough",
    style: "STRIKETHROUGH",
    icon: <StrikethroughIcon />,
    type: "inline",
  },
  {
    label: "Highlight",
    name: "highlight",
    style: "HIGHLIGHT",
    icon: <HighlightIcon />,
    type: "inline",
  },
  {
    label: "Undo",
    name: "undo",
    style: "UNDO",
    icon: <UndoIcon />,
    type: "callback",
  },
  {
    label: "Redo",
    name: "redo",
    style: "REDO",
    icon: <RedoIcon />,
    type: "callback",
  },
  {
    label: "Link",
    name: "link",
    style: "LINK",
    icon: <InsertLinkIcon />,
    type: "callback",
    id: "link-control",
  },
  {
    label: "Media",
    name: "media",
    style: "IMAGE",
    icon: <PhotoLibraryIcon />,
    type: "callback",
    id: "media-control",
  },
  {
    label: "UL",
    name: "bulletList",
    style: "unordered-list-item",
    icon: <FormatListBulletedIcon />,
    type: "block",
  },
  {
    label: "OL",
    name: "numberList",
    style: "ordered-list-item",
    icon: <FormatListNumberedIcon />,
    type: "block",
  },
  {
    label: "Blockquote",
    name: "quote",
    style: "blockquote",
    icon: <FormatQuoteIcon />,
    type: "block",
  },
  {
    label: "Code Block",
    name: "code",
    style: "code-block",
    icon: <CodeIcon />,
    type: "block",
  },
  {
    label: "Clear",
    name: "clear",
    style: "clear",
    icon: <FormatClearIcon />,
    type: "callback",
  },
  {
    label: "Save",
    name: "save",
    style: "save",
    icon: <SaveIcon />,
    type: "callback",
  },
];

const Toolbar = (props: TToolbarProps) => {
  const [availableControls, setAvailableControls] = useState(
    props.controls ? [] : STYLE_TYPES
  );
  const { editorState } = props;
  const id = props.inlineMode ? "-inline-toolbar" : "-toolbar";

  useEffect(() => {
    if (!props.controls) {
      return;
    }
    const filteredControls: TStyleType[] = [];
    const controls = props.controls.filter(
      (control, index) => props.controls!.indexOf(control) >= index
    );
    controls.forEach((name) => {
      const style = STYLE_TYPES.find((style) => style.name === name);
      if (style) {
        filteredControls.push(style);
      } else if (props.customControls) {
        const customControl = props.customControls.find(
          (style) => style.name === name
        );
        if (
          customControl &&
          customControl.type !== "atomic" &&
          (customControl.icon || customControl.component)
        ) {
          filteredControls.push({
            id: customControl.id || customControl.name + "Id",
            name: customControl.name,
            label: customControl.name,
            style: customControl.name.toUpperCase(),
            icon: customControl.icon,
            component: customControl.component,
            type: customControl.type,
            clickFnName: "onCustomClick",
          });
        }
      }
    });
    setAvailableControls(filteredControls);
  }, [props.controls, props.customControls]);

  return (
    <div id={`${props.id}${id}`} className={props.className}>
      {availableControls.map((style) => {
        if (
          props.inlineMode &&
          style.type !== "inline" &&
          style.name !== "link" &&
          style.name !== "clear"
        ) {
          return null;
        }
        let active = false;
        const action = props.onClick;
        if (!props.isActive) {
          active = false;
        } else if (style.type === "inline") {
          active = editorState.getCurrentInlineStyle().has(style.style);
        } else if (style.type === "block") {
          const selection = editorState.getSelection();
          const block = editorState
            .getCurrentContent()
            .getBlockForKey(selection.getStartKey());
          if (block) {
            active = style.style === block.getType();
          }
        } else {
          if (style.style === "IMAGE" || style.style === "LINK") {
            active = style.style === getSelectionInfo(editorState).entityType;
          }
        }

        return (
          <ToolbarButton
            id={style.id}
            editorId={props.id}
            key={`key-${style.label}`}
            active={active}
            label={style.label}
            onClick={action}
            style={style.style}
            type={style.type}
            icon={style.icon}
            component={style.component}
            inlineMode={props.inlineMode}
            disabled={props.disabled}
            size={props.size}
          />
        );
      })}
    </div>
  );
};
export default Toolbar;
