import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";

export interface Props {
  graph?: string;
  newTab?: boolean;
}

function DiscoverableWord({ graph, children, newTab }: React.PropsWithChildren<Props>): ReactElement {
  const baseUrl = useAppSelector((state) => state.userData.baseUrl);
  const destUrl = `${baseUrl}/#/notrobes?q=${graph}`;

  function manageClick() {
    if (newTab) {
      window.open(destUrl);
    }
  }
  return graph ? (
    <a onClick={manageClick} href={destUrl}>
      {children || graph}
    </a>
  ) : (
    <>{children}</>
  );
}

export default DiscoverableWord;
