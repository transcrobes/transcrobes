import { IconButton } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/core/styles/withStyles";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";
import { ReactElement, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { getSound } from "../../../lib/componentMethods";
import { TokenType } from "../../../lib/types";
import CloseIcon from "@material-ui/icons/Close";
import { setTokenDetails } from "../../../features/ui/uiSlice";

type Props = {
  classes: ClassNameMap<"header" | "sound" | "best" | "icons">;
  token: TokenType;
  bestGuess: string;
  extrasOpen: boolean;
  onToggleExtras: () => void;
};

export default function Header({ classes, token, bestGuess, extrasOpen, onToggleExtras }: Props): ReactElement {
  const [sound, setSound] = useState("");
  const definitions = useAppSelector((state) => state.definitions);
  const dispatch = useAppDispatch();

  useEffect(() => {
    (async () => {
      setSound((token.p && token.p.join("")) || (await getSound(token, definitions)));
    })();
  }, [token]);

  function toggleSentence(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onToggleExtras();
  }

  function closePopup(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    dispatch(setTokenDetails(undefined));
  }

  return (
    <div className={classes.header}>
      <div className={classes.sound}>{sound}</div>
      <div className={classes.best}>{bestGuess}</div>
      <div>
        <IconButton className={classes.icons} onClick={toggleSentence} aria-label="Extras">
          {extrasOpen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
        <IconButton className={classes.icons} onClick={closePopup} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </div>
    </div>
  );
}
