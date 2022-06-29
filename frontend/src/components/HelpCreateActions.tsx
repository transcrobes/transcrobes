import { ReactElement } from "react";
import { ListButton, ShowActionsProps, TopToolbar, useResourceDefinition } from "react-admin";
import { ExtendedActionProps } from "../lib/types";
import HelpButton from "./HelpButton";
import WatchDemo from "./WatchDemo";

const sanitizeRestProps = ({ basePath = null, className = null, hasList = null, resource = null, ...rest }) => rest;

export const HelpCreateActions = ({
  className,
  helpUrl,
  helpLabel,
  ytUrl,
  ...rest
}: ShowActionsProps & ExtendedActionProps): ReactElement => {
  const { hasList } = useResourceDefinition();

  return (
    // FIXME: the copy/paste from react-admin to create this didn't need an "as any" for the following - why?
    <TopToolbar className={className} {...sanitizeRestProps(rest as any)}>
      {hasList && <ListButton />}
      {ytUrl && <WatchDemo url={ytUrl} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
