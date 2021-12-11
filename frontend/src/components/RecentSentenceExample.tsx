import { ReactElement } from "react";

export default function RecentSentenceExample({
  modelId,
}: {
  modelId: BigInt | number;
}): ReactElement {
  return (
    <div>
      - <enriched-text-fragment id={modelId}>loading...</enriched-text-fragment>
    </div>
  );
}
