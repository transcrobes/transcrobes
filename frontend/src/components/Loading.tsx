import { CircularProgress, makeStyles, Theme } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import { FontSizeProperty, PositionProperty } from "csstype";
import { useAppSelector } from "../app/hooks";

interface StyleProps {
  position?: PositionProperty;
  top?: string;
}

const useStyles = makeStyles<Theme, StyleProps>({
  loading: {
    textAlign: "center",
    left: "50%",
    position: (props) => props.position || "absolute",
    top: (props) => props.top || "100px",
    zIndex: 100000,
    transform: "translate(-50%, 0)",
    fontSize: "3em",
  },
});

interface Props {
  message?: string;
  size?: FontSizeProperty<string | number>;
  disableShrink?: boolean;
  classes?: ClassNameMap<"message" | "loading">;
  position?: PositionProperty;
  top?: string;
}

export default function Loading({ classes, size, disableShrink, message, position, top }: Props) {
  const localClasses = useStyles({ position: position, top: top });
  const loading = useAppSelector((state) => state.ui.loading);
  return loading ? (
    <>
      <div className={classes?.loading || localClasses.loading}>
        <CircularProgress size={size || 200} disableShrink={disableShrink} />
        {message && <div className={classes?.message}>{message}</div>}
      </div>
    </>
  ) : (
    <></>
  );
}
