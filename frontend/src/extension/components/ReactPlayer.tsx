// @ts-nocheck

import merge from "deepmerge";
import memoize from "memoize-one";
import { Component } from "react";
import isEqual from "react-fast-compare";
import { defaultProps, propTypes } from "../lib/props";
import Player from "./Player";
import TranscrobesLayerPlayer from "./TranscrobesLayerPlayer";

function omit(object, ...arrays) {
  const omitKeys = [].concat(...arrays);
  const output = {};
  const keys = Object.keys(object);
  for (const key of keys) {
    if (omitKeys.indexOf(key) === -1) {
      output[key] = object[key];
    }
  }
  return output;
}

const SUPPORTED_PROPS = Object.keys(propTypes);

export class ReactPlayer extends Component {
  static displayName = "ReactPlayer";
  static propTypes = propTypes;
  static defaultProps = defaultProps;

  // Use references, as refs is used by React
  references = {
    wrapper: (wrapper) => {
      this.wrapper = wrapper;
    },
    player: (player) => {
      this.player = player;
    },
  };

  shouldComponentUpdate(nextProps, nextState) {
    return !isEqual(this.props, nextProps) || !isEqual(this.state, nextState);
  }

  getDuration = () => {
    if (!this.player) return null;
    return this.player.getDuration();
  };

  getCurrentTime = () => {
    if (!this.player) return null;
    return this.player.getCurrentTime();
  };

  getSecondsLoaded = () => {
    if (!this.player) return null;
    return this.player.getSecondsLoaded();
  };

  getInternalPlayer = (key = "player") => {
    if (!this.player) return null;
    return this.player.getInternalPlayer(key);
  };

  seekTo = (fraction, type, keepPlaying) => {
    if (!this.player) return null;
    this.player.seekTo(fraction, type, keepPlaying);
  };

  handleReady = () => {
    this.props.onReady(this);
  };

  getConfig = memoize((url, key) => {
    const { config } = this.props;
    return merge.all([defaultProps.config, defaultProps.config[key] || {}, config, config[key] || {}]);
  });

  getAttributes = memoize((url) => {
    return omit(this.props, SUPPORTED_PROPS);
  });

  render() {
    const { url, style, width, height, wrapper: Wrapper } = this.props;
    const attributes = this.getAttributes(url);
    const wrapperRef = typeof Wrapper === "string" ? this.references.wrapper : undefined;
    return (
      <Wrapper ref={wrapperRef} style={{ ...style, width, height }} {...attributes}>
        <Player
          {...this.props}
          key={TranscrobesLayerPlayer.key}
          ref={this.references.player}
          config={this.getConfig(url, TranscrobesLayerPlayer.key)}
          activePlayer={TranscrobesLayerPlayer}
          onReady={this.handleReady}
        />
      </Wrapper>
    );
  }
}
