import FlashOffIcon from "@mui/icons-material/FlashOff";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { Box, IconButton, useTheme } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { useAppDispatch } from "../../../app/hooks";
import { addKnownCards } from "../../../features/card/knownCardsSlice";
import { updateDefinition } from "../../../features/definition/definitionsSlice";
import { TokenDetailsState, setTokenDetails } from "../../../features/ui/uiSlice";
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

export default function Actions({ className, tokenDetails, definition }: Props): ReactElement {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const dispatch = useAppDispatch();
  const translate = useTranslate();
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

  const theme = useTheme();
  return tokenDetails.token.id ? (
    <>
      <Loading
        messageSx={{ fontSize: "0.4em" }}
        position="relative"
        size={50}
        top="0px"
        message={translate("widgets.popup.saving_cards")}
        show={saving}
      />
      {message && <div>{message}</div>}
      <Box className={className}>
        <Box
          sx={{
            padding: "0.5em",
            width: "20%",
          }}
        >
          {!tokenDetails.gloss ? (
            <IconButton
              sx={{
                "& svg": {
                  fontSize: 32,
                  color: theme.palette.text.primary,
                },
                padding: "2px",
              }}
              title={translate("widgets.popup.gloss_now")}
              onClick={toggleGloss}
              size="large"
            >
              <FlashOnIcon />
            </IconButton>
          ) : (
            <IconButton
              sx={{
                "& svg": {
                  fontSize: 32,
                  color: theme.palette.text.primary,
                },
                padding: "2px",
              }}
              title={translate("widgets.popup.dont_gloss_now")}
              onClick={toggleGloss}
              size="large"
            >
              <FlashOffIcon />
            </IconButton>
          )}
        </Box>
        <PracticerInput
          onPractice={addOrUpdateCards}
          wordId={tokenDetails.token.id}
          iconColour={theme.palette.text.primary}
          smallSize={32}
          largeSize={32}
          iconPadding="2px"
          width={"80%"}
        />
      </Box>
    </>
  ) : (
    <div>{translate("widgets.popup.synchronising")}</div>
  );
}
