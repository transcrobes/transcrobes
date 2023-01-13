import { ClassNameMap, IconButton } from "@mui/material";
import Fullscreen from "@mui/icons-material/Fullscreen";
import FullscreenExit from "@mui/icons-material/FullscreenExit";
import { ReactElement, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { getSound } from "../../../lib/componentMethods";
import { TokenType } from "../../../lib/types";
import CloseIcon from "@mui/icons-material/Close";
import { setTokenDetails } from "../../../features/ui/uiSlice";
import DiscoverableWord from "../../DiscoverableWord";
import SayIt from "../../SayIt";

type Props = {
  classes: ClassNameMap<"header" | "sound" | "best" | "icons" | "popupControls">;
  token: TokenType;
  bestGuess: string;
  extrasOpen: boolean;
  onToggleExtras: () => void;
};

export default function Header({ classes, token, bestGuess, extrasOpen, onToggleExtras }: Props): ReactElement {
  const [sound, setSound] = useState([""]);
  const definitions = useAppSelector((state) => state.definitions);
  const dispatch = useAppDispatch();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);

  useEffect(() => {
    (async () => {
      setSound((token.p && token.p) || (await getSound(token, definitions)));
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
      <SayIt graph={token.w || token.l} sound={sound} lang={fromLang} />
      <div className={classes.best}>{bestGuess}</div>
      <DiscoverableWord graph={token.l} sound={sound} newTab />
      <div>
        <IconButton sx={{ padding: "3px" }} onClick={toggleSentence} aria-label="Extras" size="large">
          {extrasOpen ? (
            <FullscreenExit sx={{ fontSize: "24px" }} className={classes.icons} />
          ) : (
            <Fullscreen sx={{ fontSize: "24px" }} className={classes.icons} />
          )}
        </IconButton>
        <IconButton sx={{ padding: "3px 3px 3px 6px" }} onClick={closePopup} aria-label="Close" size="large">
          {/* FIXME: how TF??? do I set the guarantee fontSize cleanly??? */}
          <CloseIcon sx={{ fontSize: "24px" }} className={classes.icons} />
        </IconButton>
      </div>
    </div>
  );
}
