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
    <TopToolbar className={className} {...rest}>
      {hasList && <ListButton basePath={basePath} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
