import { ReactElement } from "react";
import { EditButton, ShowActionsProps, TopToolbar, useEditContext, useResourceDefinition } from "react-admin";
import HelpButton from "./HelpButton";

const sanitizeRestProps = ({ basePath, className, hasEdit, hasList, resource, ...rest }: any) => rest;

export const HelpShowActions = ({
  className,
  helpUrl,
  helpLabel,
  ...rest
}: ShowActionsProps & { helpUrl: string; helpLabel?: string }): ReactElement => {
  const { record } = useEditContext(rest);
  const { hasEdit } = useResourceDefinition();

  return (
    <TopToolbar className={className} {...sanitizeRestProps(rest)}>
      {hasEdit && <EditButton record={record} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
