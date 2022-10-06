import { ReactElement, useRef } from "react";
import { useParams } from "react-router-dom";
import { makeStyles } from "tss-react/mui";
import { store } from "../../app/createStore";
import { useAppSelector, useJssStyles } from "../../app/hooks";
import { enrichETFElements } from "../../components/content/etf/EnrichedTextFragment";
import { ContentParams, DEFAULT_VIDEO_READER_CONFIG_STATE, KeyedModels, VideoReaderState } from "../../lib/types";

interface Props {
  models: KeyedModels;
  currentCue: string;
}

const useStyles = makeStyles<VideoReaderState>()((_theme, params) => {
  return {
    boxWidth: {
      maxWidth: `${(params.subBoxWidth || 1) * 100}%`,
    },
  };
});

function SubtitleControl({ currentCue, models }: Props): ReactElement {
  const { id = "" } = useParams<ContentParams>();
  const readerConfig = useAppSelector((state) => state.videoReader[id] || DEFAULT_VIDEO_READER_CONFIG_STATE);

  const ref = useRef<HTMLDivElement>(null);
  const { classes } = useStyles(readerConfig);
  const etfClasses = useJssStyles(readerConfig);

  if (ref.current && models) {
    enrichETFElements(ref.current, currentCue, readerConfig, models, store, etfClasses);
  }

  return <div className={classes.boxWidth} ref={ref} />;
}

export default SubtitleControl;
