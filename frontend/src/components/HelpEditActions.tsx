import { ReactElement } from "react";
import {
  TopToolbar,
  ShowButton,
  EditActionsProps,
  useEditContext,
  useResourceDefinition,
} from "react-admin";
import HelpButton from "./HelpButton";

export const HelpEditActions = ({
  className,
  helpUrl,
  helpLabel,
  ...rest
}: EditActionsProps & { helpUrl: string; helpLabel?: string }): ReactElement => {
  const { basePath, record } = useEditContext(rest);
  const { hasShow } = useResourceDefinition(rest);

  return (
    <TopToolbar className={className} {...rest}>
      {hasShow && <ShowButton basePath={basePath} record={record} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
