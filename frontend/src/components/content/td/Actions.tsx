import { IconButton, makeStyles, Theme } from "@material-ui/core";
import FlashOffIcon from "@material-ui/icons/FlashOff";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import * as CSS from "csstype";
import { ReactElement, useEffect, useState } from "react";
import { useAppDispatch } from "../../../app/hooks";
import { addKnownCards } from "../../../features/card/knownCardsSlice";
import { updateDefinition } from "../../../features/definition/definitionsSlice";
import { setTokenDetails, TokenDetailsState } from "../../../features/ui/uiSlice";
import { originalSentenceFromTokens } from "../../../lib/funclib";
import { platformHelper } from "../../../lib/proxies";
import { CardType, DefinitionState, USER_STATS_MODE } from "../../../lib/types";
import { Loading } from "../../Loading";
import PracticerInput from "../../PracticerInput";

type Props = {
  definition: DefinitionState;
  tokenDetails: TokenDetailsState;
  className: string;
};

const DATA_SOURCE = "Actions.jsx";

interface IconProps {
  iconColour?: CSS.Color;
}

const useStyles = makeStyles<Theme, IconProps>({
  message: {
    fontSize: "1em",
  },
  loading: { textAlign: "center" },
  iconStyle: {
    "& svg": {
      fontSize: 32,
      color: (props) => props.iconColour || "white",
    },
    padding: "2px",
  },
  toggle: {
    padding: "0.5em",
  },
});

export default function Actions({ className, tokenDetails, definition }: Props): ReactElement {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const dispatch = useAppDispatch();
  function toggleGloss(event: React.MouseEvent<HTMLSpanElement>) {
    dispatch(updateDefinition({ ...definition, glossToggled: !definition.glossToggled }));
    dispatch(setTokenDetails({ ...tokenDetails, gloss: !tokenDetails.gloss }));
    event.preventDefault();
    event.stopPropagation();
  }
  async function addOrUpdateCards(wordId: string, grade: number): Promise<void> {
    setSaving(true);
    // FIXME: grade should be an enum
    platformHelper.sendMessagePromise({
      source: DATA_SOURCE,
      type: "submitUserEvents",
      value: {
        type: "practice_card",
        data: {
          target_word: tokenDetails.token.l,
          grade: grade,
          source_sentence: originalSentenceFromTokens(tokenDetails.sentence.t),
        },
        source: DATA_SOURCE,
      },
    });

    await platformHelper.sendMessagePromise<CardType[]>({
      source: DATA_SOURCE,
      type: "addOrUpdateCardsForWord",
      value: { wordId: wordId, grade },
    });
    if (grade > USER_STATS_MODE.NO_GLOSS) {
      dispatch(addKnownCards({ [tokenDetails.token.l]: null }));
    }
    setMessage("Cards saved");
    setSaving(false);
  }
  useEffect(() => {
    setMessage("");
  }, [tokenDetails.token.l]);

  const classes = useStyles({ iconColour: "white" });

  return tokenDetails.token.id ? (
    <>
      {saving && <Loading classes={classes} position="relative" size={50} top="0px" message="Saving Cards..." />}
      {message && <div>{message}</div>}
      <div className={className}>
        <div className={classes.toggle}>
          {!tokenDetails.gloss ? (
            <IconButton className={classes.iconStyle} title="Gloss right now" onClick={toggleGloss}>
              <FlashOnIcon />
            </IconButton>
          ) : (
            <IconButton className={classes.iconStyle} title="Don't gloss right now" onClick={toggleGloss}>
              <FlashOffIcon />
            </IconButton>
          )}
        </div>
        {/* FIXME: change white to theme-sensitive! */}
        <PracticerInput
          onPractice={addOrUpdateCards}
          wordId={tokenDetails.token.id}
          iconColour={"white"}
          smallSize={32}
          largeSize={32}
          iconPadding="2px"
        />
      </div>
    </>
  ) : (
    <div>New word synchronising, please wait</div>
  );
}
