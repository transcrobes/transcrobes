import { IconButton } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";
import { ReactElement, useEffect, useState } from "react";
import { useAppSelector } from "../../../app/hooks";
import { getSound } from "../../../lib/componentMethods";
import { TokenType } from "../../../lib/types";

type Props = {
  classes: ClassNameMap<string>;
  token: TokenType;
  bestGuess: string;
  extrasOpen: boolean;
  onToggleExtras: () => void;
};

export default function Header({ classes, token, bestGuess, extrasOpen, onToggleExtras }: Props): ReactElement {
  const [sound, setSound] = useState("");
  const definitions = useAppSelector((state) => state.definitions);

  useEffect(() => {
    (async () => {
      setSound((token.p && token.p.join("")) || (await getSound(token, definitions)));
    })();
  }, []);

  function toggleSentence(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onToggleExtras();
  }

  return (
    <div className={classes.header}>
      <div className={classes.sound}>{sound}</div>
      <div className={classes.best}>{bestGuess}</div>
      <IconButton onClick={toggleSentence} aria-label="Extras">
        {extrasOpen ? <FullscreenExit /> : <Fullscreen />}
      </IconButton>
    </div>
  );
}
