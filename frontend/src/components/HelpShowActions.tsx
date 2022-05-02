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
  // const { basePath, record } = useEditContext(rest);
  // const { hasEdit } = useResourceDefinition(rest);

  return (
    <TopToolbar className={className} {...sanitizeRestProps(rest)}>
      {/* {hasEdit && <EditButton basePath={basePath} record={record} />} */}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
