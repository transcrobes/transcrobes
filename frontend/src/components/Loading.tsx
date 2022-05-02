import { CircularProgress, ClassNameMap } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import * as CSS from "csstype";
import { useAppSelector } from "../app/hooks";

interface StyleProps {
  position?: CSS.Property.Position;
  top?: string;
}

const useStyles = makeStyles<StyleProps>()((_theme, params) => {
  return {
    loading: {
      textAlign: "center",
      left: "50%",
      position: params.position || "absolute",
      top: params.top || "100px",
      zIndex: 100000,
      transform: "translate(-50%, 0)",
      fontSize: "3em",
    },
  };
});

interface Props {
  message?: string;
  size?: CSS.Property.FontSize<string | number>;
  disableShrink?: boolean;
  classes?: ClassNameMap<"message" | "loading">;
  position?: CSS.Property.Position;
  top?: string;
  show?: boolean;
}

export function Loading({ classes, size, disableShrink, message, position, top, show }: Props) {
  const { classes: localClasses } = useStyles({ position: position, top: top });
  return show ? (
    <div className={classes?.loading || localClasses.loading}>
      <CircularProgress size={size || 200} disableShrink={disableShrink} />
      {message && <div className={classes?.message}>{message}</div>}
    </div>
  ) : (
    <></>
  );
}

export default function GlobalLoading(props: Props) {
  const loading = useAppSelector((state) => state.ui.loading);
  return <Loading {...props} show={!!loading} />;
}
