import { ReactElement } from "react";

type Props = { message: string };

export default function Messages({ message }: Props): ReactElement {
  return <div>{message}</div>;
}
