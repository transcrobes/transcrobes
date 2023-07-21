import { ProgressCallbackMessage } from "../lib/types";

export function progressCallback(progress: ProgressCallbackMessage) {
  postMessage({
    source: progress.source,
    type: "progress",
    value: progress,
  });
}
