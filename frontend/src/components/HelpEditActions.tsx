import { ReactElement } from "react";
import { EditActionsProps, ShowButton, TopToolbar, useEditContext, useResourceDefinition } from "react-admin";
import HelpButton from "./HelpButton";

const sanitizeRestProps = ({
  basePath = null,
  hasCreate = null,
  hasEdit = null,
  hasShow = null,
  hasList = null,
  ...rest
}) => rest;

export const HelpEditActions = ({
  className,
  helpUrl,
  helpLabel,
  ...rest
}: EditActionsProps & { helpUrl: string; helpLabel?: string }): ReactElement => {
  const { record } = useEditContext(rest);
  const { hasShow } = useResourceDefinition(rest);

  return (
    <TopToolbar className={className} {...sanitizeRestProps(rest as any)}>
      {hasShow && <ShowButton record={record} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
