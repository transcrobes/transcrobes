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
import { useAppSelector } from "../app/hooks";
import { CommonRecord, ExtendedActionProps } from "../lib/types";
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
  const userId = useAppSelector((state) => state.userData.user.id);
  return (
    <TopToolbar className={className} {...sanitizeRestProps(rest)}>
      {hasCreate && <CreateButton />}
      {hasEdit &&
        (!record || !(record as CommonRecord)?.created_by || userId === (record as CommonRecord).created_by) && (
          <EditButton record={record} />
        )}
      {hasList && <ListButton />}
      {ytUrl && <WatchDemo url={ytUrl} />}
      <HelpButton url={helpUrl} text={helpLabel} />
    </TopToolbar>
  );
};
