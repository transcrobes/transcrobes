import { ReactElement } from "react";
import {
  TopToolbar,
  ListButton,
  ShowActionsProps,
  useEditContext,
  useResourceDefinition,
} from "react-admin";
import HelpButton from "./HelpButton";

export const HelpCreateActions = ({
  className,
  helpUrl,
  helpLabel,
  ...rest
}: ShowActionsProps & { helpUrl: string; helpLabel?: string }): ReactElement => {
  const { basePath } = useEditContext(rest);
  const { hasList } = useResourceDefinition(rest);

  return (
    // FIXME: the copy/paste from react-admin to create this didn't need an "as any" for the following - why?
    <TopToolbar className={className} {...sanitizeRestProps(rest as any)}>
      {hasList && <ListButton basePath={basePath} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};

const sanitizeRestProps = ({
  basePath = null,
  className = null,
  hasList = null,
  resource = null,
  ...rest
}) => rest;
