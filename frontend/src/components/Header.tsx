import { ReactElement } from "react";

export default function Header({ text }: { text: string }): ReactElement {
  return (
    <div>
      <h4 style={{ marginBlockStart: ".5em", marginBlockEnd: ".5em" }}>{text}</h4>
    </div>
  );
}
