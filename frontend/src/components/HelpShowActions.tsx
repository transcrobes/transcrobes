import { ReactElement } from "react";
import {
  TopToolbar,
  EditButton,
  ShowActionsProps,
  useEditContext,
  useResourceDefinition,
} from "react-admin";
import HelpButton from "./HelpButton";

export const HelpShowActions = ({
  className,
  helpUrl,
  helpLabel,
  ...rest
}: ShowActionsProps & { helpUrl: string; helpLabel?: string }): ReactElement => {
  const { basePath, record } = useEditContext(rest);
  const { hasEdit } = useResourceDefinition(rest);

  return (
    <TopToolbar className={className} {...rest}>
      {hasEdit && <EditButton basePath={basePath} record={record} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
