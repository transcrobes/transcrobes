import { ReactElement } from "react";

interface Props {
  modelId: BigInt | number;
  cssClasses?: string;
  isListItem?: boolean;
}

export default function RecentSentenceExample({
  modelId,
  cssClasses,
  isListItem = true,
}: Props): ReactElement {
  console.log("RecentSentenceExample", modelId);
  return isListItem ? (
    <li className={cssClasses}>
      <enriched-text-fragment id={modelId}>loading...</enriched-text-fragment>
    </li>
  ) : (
    <span className={cssClasses}>
      <enriched-text-fragment id={modelId}>loading...</enriched-text-fragment>
    </span>
  );
}
