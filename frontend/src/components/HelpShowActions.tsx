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
import HelpButton from "./HelpButton";

const sanitizeRestProps = ({ basePath, className, hasEdit, hasList, resource, ...rest }: any) => rest;

export const HelpShowActions = ({
  className,
  helpUrl,
  helpLabel,
  ...rest
}: ShowActionsProps & { helpUrl: string; helpLabel?: string }): ReactElement => {
  const { record } = useEditContext(rest);
  const { hasEdit, hasList, hasCreate } = useResourceDefinition();

  return (
    <TopToolbar className={className} {...sanitizeRestProps(rest)}>
      {hasCreate && <CreateButton />}
      {hasEdit && <EditButton record={record} />}
      {hasList && <ListButton />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
