import { Link } from "@mui/material";
import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";

export interface Props {
  graph?: string;
  newTab?: boolean;
}

function DiscoverableWord({ graph, children, newTab }: React.PropsWithChildren<Props>): ReactElement {
  const baseUrl = useAppSelector((state) => state.userData.baseUrl);
  const destUrl = `${baseUrl}/#/notrobes?q=${graph}`;

  function manageClick(
    event: React.MouseEvent<HTMLSpanElement, MouseEvent> | React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) {
    if (newTab) {
      event.preventDefault();
      window.open(destUrl);
    }
  }
  return graph ? (
    <Link onClick={manageClick} href={destUrl}>
      {children || graph}
    </Link>
  ) : (
    <>{children}</>
  );
}

export default DiscoverableWord;
