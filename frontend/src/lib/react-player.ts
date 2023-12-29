import { CSSProperties, ComponentType, ReactElement, ReactNode } from "react";

interface SourceProps {
  media?: string;
  src: string;
  type?: string;
}

export interface OnProgressProps {
  played: number;
  playedSeconds: number;
  loaded: number;
  loadedSeconds: number;
}

export interface BaseReactPlayerProps {
  url?: string | string[] | SourceProps[] | MediaStream;
  playing?: boolean;
  loop?: boolean;
  controls?: boolean;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
  progressInterval?: number;
  playsinline?: boolean;
  playIcon?: ReactElement;
  previewTabIndex?: number | null;
  pip?: boolean;
  stopOnUnmount?: boolean;
  light?: boolean | string | ReactElement;
  fallback?: ReactElement;
  wrapper?: ComponentType<{ children: ReactNode }>;
  onReady?: (player: any) => void;
  onStart?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onBuffer?: () => void;
  onBufferEnd?: () => void;
  onEnded?: () => void;
  onClickPreview?: (event: any) => void;
  onEnablePIP?: () => void;
  onDisablePIP?: () => void;
  onError?: (error: any, data?: any, hlsInstance?: any, hlsGlobal?: any) => void;
  onDuration?: (duration: number) => void;
  onSeek?: (seconds: number) => void;
  onProgress?: (state: OnProgressProps) => void;
  [otherProps: string]: any;
}
