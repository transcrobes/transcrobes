import { useTheme } from "@mui/system";
import { FunctionField, useRecordContext } from "react-admin";
import { PROCESSING, reverseEnum } from "../lib/types";

export function ProcessingField({ label }: { label?: string }) {
  const record = useRecordContext();
  const theme = useTheme();
  return (
    <FunctionField
      source="processing"
      sx={{
        ...(record.processing === PROCESSING.NONE && {
          color: theme.palette.primary.main,
        }),
        ...(record.processing === PROCESSING.REQUESTED && {
          color: theme.palette.warning.main,
        }),
        ...(record.processing === PROCESSING.PROCESSING && {
          color: theme.palette.warning.main,
        }),
        ...(record.processing === PROCESSING.FINISHED && {
          color: theme.palette.success.main,
        }),
        ...(record.processing === PROCESSING.ERROR && {
          color: theme.palette.error.main,
        }),
      }}
      render={(record: any) => reverseEnum(PROCESSING, record.processing)}
    />
  );
}
