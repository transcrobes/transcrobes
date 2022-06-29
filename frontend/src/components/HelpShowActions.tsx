import { ReactElement } from "react";
import {
  CreateButton,
  EditButton,
  ListButton,
  ShowActionsProps,
  TopToolbar,
  useEditContext,
  useResourceDefinition,
} from "react-admin";
import { ExtendedActionProps } from "../lib/types";
import HelpButton from "./HelpButton";
import WatchDemo from "./WatchDemo";

const sanitizeRestProps = ({ basePath, className, hasEdit, hasList, resource, ...rest }: any) => rest;

export const HelpShowActions = ({
  className,
  helpUrl,
  helpLabel,
  ytUrl,
  ...rest
}: ShowActionsProps & ExtendedActionProps): ReactElement => {
  const { record } = useEditContext(rest);
  const { hasEdit, hasList, hasCreate } = useResourceDefinition();

  return (
    <TopToolbar className={className} {...sanitizeRestProps(rest)}>
      {hasCreate && <CreateButton />}
      {hasEdit && <EditButton record={record} />}
      {hasList && <ListButton />}
      {ytUrl && <WatchDemo url={ytUrl} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
