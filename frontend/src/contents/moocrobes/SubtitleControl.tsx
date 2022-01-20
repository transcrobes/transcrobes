import { makeStyles, Theme } from "@material-ui/core";
import { ReactElement, useRef } from "react";
import { useParams } from "react-router-dom";
import { store } from "../../app/createStore";
import { useAppSelector, useJssStyles } from "../../app/hooks";
import { enrichETFElements } from "../../components/content/etf/EnrichedTextFragment";
import { DEFAULT_VIDEO_READER_CONFIG_STATE, VideoReaderState } from "../../features/content/videoReaderSlice";
import { ContentParams, KeyedModels } from "../../lib/types";

interface Props {
  models: KeyedModels;
  currentCue: string;
}

const useStyles = makeStyles<Theme, VideoReaderState>({
  boxWidth: {
    maxWidth: (props) => `${(props.subBoxWidth || 1) * 100}%`,
  },
});

function SubtitleControl({ currentCue, models }: Props): ReactElement {
  const { id } = useParams<ContentParams>();
  const readerConfig = useAppSelector((state) => state.videoReader[id] || DEFAULT_VIDEO_READER_CONFIG_STATE);

  const ref = useRef<HTMLDivElement>(null);
  const classes = useStyles(readerConfig);
  const etfClasses = useJssStyles(readerConfig);

  if (ref.current && models) {
    enrichETFElements(ref.current, currentCue, readerConfig, models, store, etfClasses);
  }

  return <div className={classes.boxWidth} ref={ref} />;
}

export default SubtitleControl;
