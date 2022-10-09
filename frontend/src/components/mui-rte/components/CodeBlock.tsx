import { Theme } from "@mui/material/styles";
import React, { FunctionComponent } from "react";
import { withStyles } from "tss-react/mui";

interface IBlockquoteProps {
  children?: React.ReactNode;
  classes?: Partial<Record<"root", string>>;
}

const CodeBlock: FunctionComponent<IBlockquoteProps> = ({
  classes,
  children,
}: IBlockquoteProps) => {
  return <div className={classes!.root}>{children}</div>;
};

export default withStyles(CodeBlock, ({ spacing, palette }: Theme) => ({
  root: {
    backgroundColor: palette.grey[200],
    padding: spacing(1, 2, 1, 2),
  },
}));
