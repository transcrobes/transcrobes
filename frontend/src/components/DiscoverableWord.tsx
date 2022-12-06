import { Link } from "@mui/material";
import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
import { toneColour } from "../lib/funclib";
import { Box } from "@mui/system";

export interface Props {
  graph?: string;
  sound?: string[];
  newTab?: boolean;
}

function DiscoverableWord({ graph, children, sound, newTab }: React.PropsWithChildren<Props>): ReactElement {
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
  function colours(graph: string, sound?: string[]): JSX.Element[] | string {
    if (sound && sound.length === graph.length) {
      return graph.split("").map((g, i) => (
        <Box component="span" sx={{ color: toneColour(sound[i]) }}>
          {g}
        </Box>
      ));
    } else {
      return graph;
    }
  }
  return graph ? (
    <Link onClick={manageClick} href={destUrl}>
      {children || colours(graph, sound)}
    </Link>
  ) : (
    <>{children}</>
  );
}

export default DiscoverableWord;
