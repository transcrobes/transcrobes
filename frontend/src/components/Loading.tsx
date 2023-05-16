import { Box, CircularProgress, Theme } from "@mui/material";
import { SxProps } from "@mui/system";
import * as CSS from "csstype";
import { useAppSelector } from "../app/hooks";

interface Props {
  message?: string;
  size?: CSS.Property.FontSize<string | number>;
  disableShrink?: boolean;
  messageSx?: SxProps<Theme>;
  position?: CSS.Property.Position;
  top?: string;
  show?: boolean;
}

export function Loading({ size, disableShrink, message, position, top, show, messageSx }: Props) {
  const cl = {
    textAlign: "center",
    left: "50%",
    position: position || "absolute",
    top: top || "100px",
    zIndex: 100000,
    transform: "translate(-50%, 0)",
    fontSize: "3em",
  };
  return show ? (
    <Box sx={cl}>
      <CircularProgress size={size || 200} disableShrink={disableShrink} />
      {message && <Box sx={messageSx}>{message}</Box>}
    </Box>
  ) : (
    <></>
  );
}

export default function GlobalLoading(props: Props) {
  const { loading, loadingMessage } = useAppSelector((state) => state.ui);
  return <Loading {...props} show={!!loading} message={loadingMessage || props.message} />;
}
