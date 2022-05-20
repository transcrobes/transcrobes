import { ReactElement } from "react";
import { ListButton, ShowActionsProps, TopToolbar, useResourceDefinition } from "react-admin";
import HelpButton from "./HelpButton";

const sanitizeRestProps = ({ basePath = null, className = null, hasList = null, resource = null, ...rest }) => rest;

export const HelpCreateActions = ({
  className,
  helpUrl,
  helpLabel,
  ...rest
}: ShowActionsProps & { helpUrl: string; helpLabel?: string }): ReactElement => {
  const { hasList } = useResourceDefinition();

  return (
    // FIXME: the copy/paste from react-admin to create this didn't need an "as any" for the following - why?
    <TopToolbar className={className} {...sanitizeRestProps(rest as any)}>
      {hasList && <ListButton />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
