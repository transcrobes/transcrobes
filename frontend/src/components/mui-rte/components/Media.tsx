import { Theme } from "@mui/material/styles";
import classNames from "classnames";
import { ContentBlock, ContentState } from "draft-js";
import React from "react";
import { withStyles } from "tss-react/mui";

interface IMediaProps {
  block: ContentBlock;
  contentState: ContentState;
  blockProps: any;
  onClick: (block: ContentBlock) => void;
  classes?: Partial<
    Record<
      | "root"
      | "editable"
      | "focused"
      | "centered"
      | "leftAligned"
      | "rightAligned",
      string
    >
  >;
}

const Media = ({ classes, blockProps, contentState, block }: IMediaProps) => {
  const { url, width, height, alignment, type } = contentState
    .getEntity(block.getEntityAt(0))
    .getData();
  const { onClick, readOnly, focusKey } = blockProps;

  const htmlTag = () => {
    const componentProps = {
      src: url,
      className: classNames(classes!.root, {
        [classes!.editable!]: !readOnly,
        [classes!.focused!]: !readOnly && focusKey === block.getKey(),
      }),
      width: width,
      height: type === "video" ? "auto" : height,
      onClick: () => {
        if (readOnly) {
          return;
        }
        onClick(block);
      },
    };

    if (!type || type === "image") {
      return <img {...componentProps} />;
    }
    if (type === "video") {
      return <video {...componentProps} autoPlay={false} controls />;
    }
    return null;
  };

  return (
    <div
      className={classNames({
        [classes!.centered!]: alignment === "center",
        [classes!.leftAligned!]: alignment === "left",
        [classes!.rightAligned!]: alignment === "right",
      })}
    >
      {htmlTag()}
    </div>
  );
};

export default withStyles(Media, ({ shadows }: Theme) => ({
  root: {
    margin: "5px 0 1px",
    outline: "none",
  },
  editable: {
    cursor: "pointer",
    "&:hover": {
      boxShadow: shadows[3],
    },
  },
  focused: {
    boxShadow: shadows[3],
  },
  centered: {
    textAlign: "center" as const,
  },
  leftAligned: {
    textAlign: "left" as const,
  },
  rightAligned: {
    textAlign: "right" as const,
  },
}));
