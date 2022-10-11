import { useTheme } from "@mui/system";
import { FunctionField, useRecordContext, useTranslate } from "react-admin";
import { PROCESSING, reverseEnum } from "../lib/types";

export function ProcessingField({ label }: { label?: string }) {
  const record = useRecordContext();
  const theme = useTheme();
  const translate = useTranslate();
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
      render={(record: any) => translate(`widgets.processing.${PROCESSING[record.processing].toLowerCase()}`)}
    />
  );
}
