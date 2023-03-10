import { ReactElement } from "react";
import {
  CreateButton,
  EditActionsProps,
  ListButton,
  ShowButton,
  TopToolbar,
  useEditContext,
  useResourceDefinition,
} from "react-admin";
import { ExtendedActionProps } from "../lib/types";
import HelpButton from "./HelpButton";
import WatchDemo from "./WatchDemo";

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
  ytUrl,
  noCreate,
  ...rest
}: EditActionsProps & ExtendedActionProps): ReactElement => {
  const { record } = useEditContext(rest);
  const { hasShow, hasList, hasCreate } = useResourceDefinition(rest);

  return (
    <TopToolbar className={className} {...sanitizeRestProps(rest as any)}>
      {hasCreate && !noCreate && <CreateButton />}
      {hasShow && <ShowButton record={record} />}
      {hasList && <ListButton />}
      {ytUrl && <WatchDemo url={ytUrl} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
