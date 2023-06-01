import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import React, { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import FineControl from "../../components/FineControl";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import { videoReaderActions } from "../../features/content/videoReaderSlice";
import { isOnFullscreen } from "../../hooks/useFullscreen";
import { DEFAULT_VIDEO_READER_CONFIG_STATE, SubPosition } from "../../lib/types";
import ReaderConfig from "../common/ContentConfig";
import PlaybackRate from "./PlaybackRate";
import SubDelay from "./SubDelay";
import SubPlaybackRate from "./SubPlaybackRate";

export interface VideoReaderConfigProps {
  id: string;
  containerRef?: React.RefObject<HTMLDivElement>;
  onSubDelayChange: (delay: number) => void;
}

const useStyles = makeStyles()((theme) => ({
  fineControlIcons: {
    color: "#777",
    fontSize: 20,
    transform: "scale(0.9)",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
      transform: "scale(1)",
    },
  },
  [theme.breakpoints.up("sm")]: {
    buttonGroup: { padding: "0.3em", width: "100%" },
  },
  [theme.breakpoints.down("md")]: {
    buttonGroup: { flexWrap: "wrap" as const, padding: "0.3em", width: "100%" },
  },
  button: { width: "100%" },
}));

export default function VideoConfig({ containerRef, onSubDelayChange, id }: VideoReaderConfigProps): ReactElement {
  const { classes: localClasses } = useStyles();
  const translate = useTranslate();
  const readerConfig = useAppSelector((state) => state.videoReader[id] || { ...DEFAULT_VIDEO_READER_CONFIG_STATE, id });

  const dispatch = useAppDispatch();
  const actions = videoReaderActions;
  return (
    <div>
      {/* FIXME: this is extremely nasty. I am horrible. Default nav height is 48. Sometimes */}
      {!isOnFullscreen() && <div style={{ height: "50px" }}></div>}
      <Conftainer label={translate("screens.moocrobes.config.subs_position.title")} id="sp">
        <ToggleButtonGroup
          className={localClasses.button}
          value={readerConfig.subPosition}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: SubPosition) => {
            dispatch(actions.setSubPosition({ id, value }));
          }}
        >
          <ToggleButton className={localClasses.button} value="top">
            {translate("screens.moocrobes.config.subs_position.top")}
          </ToggleButton>
          <ToggleButton className={localClasses.button} value="bottom">
            {translate("screens.moocrobes.config.subs_position.bottom")}
          </ToggleButton>
          <ToggleButton className={localClasses.button} value="under">
            {translate("screens.moocrobes.config.subs_position.under")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("screens.moocrobes.config.subs_box_width.title")} id="sbw">
        <FivePercentFineControl
          onValueChange={(value) => dispatch(actions.setSubBoxWidth({ id, value }))}
          value={readerConfig.subBoxWidth}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>
      <Conftainer label={translate("screens.moocrobes.config.subs_synchronisation.title")} id="sd">
        <SubDelay
          onValueChange={onSubDelayChange}
          value={readerConfig.subDelay}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>
      <Conftainer label={translate("screens.moocrobes.config.playback_rate.title")} id="pr">
        <PlaybackRate
          onValueChange={(value) => dispatch(actions.setPlaybackRate({ id, value }))}
          value={readerConfig.playbackRate}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>
      <Conftainer label={translate("screens.moocrobes.config.subtitle_playback_rate.title")} id="spr">
        <SubPlaybackRate
          onValueChange={(value) => dispatch(actions.setSubPlaybackRate({ id, value }))}
          value={readerConfig.subPlaybackRate}
          className={localClasses.fineControlIcons}
        />
      </Conftainer>
      <Conftainer label={translate("screens.moocrobes.config.subs_background_blur.title")} id="sbb">
        <ToggleButtonGroup
          className={localClasses.button}
          value={readerConfig.subBackgroundBlur}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            dispatch(actions.setSubBackgroundBlur({ id, value }));
          }}
        >
          <ToggleButton className={localClasses.button} value={false}>
            {translate("screens.moocrobes.config.subs_background_blur.none")}
          </ToggleButton>
          <ToggleButton className={localClasses.button} value={true}>
            {translate("screens.moocrobes.config.subs_background_blur.blur")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer label={translate("screens.moocrobes.config.subs_raise.title")} id="raiseSubs">
        <FineControl
          title={""}
          labelLess={translate("widgets.fine_control.raw.less", { amount: 10 })}
          labelMore={translate("widgets.fine_control.raw.more", { amount: 10 })}
          className={""}
          isPercent={false}
          onLess={() => {
            dispatch(actions.setSubRaise({ id, value: (readerConfig.subRaise || 0) - 10 }));
          }}
          onMore={() => {
            dispatch(actions.setSubRaise({ id, value: (readerConfig.subRaise || 0) + 10 }));
          }}
          value={readerConfig.subRaise || 0}
        />
      </Conftainer>
      <Conftainer label={translate("screens.moocrobes.config.volume_boost.title")} id="volumeBoost">
        <FineControl
          title={""}
          labelLess={translate("widgets.fine_control.raw.less", { amount: 1 })}
          labelMore={translate("widgets.fine_control.raw.more", { amount: 1 })}
          className={""}
          isPercent={false}
          onLess={() => {
            if (readerConfig.volumeBoost > 1) {
              dispatch(actions.setVolumeBoost({ id, value: (readerConfig.volumeBoost || 1) - 1 }));
            }
          }}
          onMore={() => {
            if (readerConfig.volumeBoost < 4) {
              dispatch(actions.setVolumeBoost({ id, value: (readerConfig.volumeBoost || 1) + 1 }));
            }
          }}
          value={readerConfig.volumeBoost || 1}
        />
      </Conftainer>

      <ReaderConfig
        classes={localClasses}
        containerRef={containerRef}
        actions={videoReaderActions}
        readerConfig={readerConfig}
      />
    </div>
  );
}
