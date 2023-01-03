import { Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { getVoices, say } from "../lib/funclib";
import { LOCALES, SystemLanguage, SYSTEM_LANG_TO_LOCALE } from "../lib/types";
import SoundBox from "./SoundBox";

type Props = {
  graph: string;
  lang: SystemLanguage;
  sound?: string[];
};

export default function SayIt({ graph, sound, lang }: Props) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | undefined>(undefined);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const translate = useTranslate();
  useEffect(() => {
    getVoices()
      .then((voices) => {
        setVoice(
          voices.filter((x) => x.lang === SYSTEM_LANG_TO_LOCALE[lang] && x.localService)[0] ||
            voices.filter((x) => x.lang === SYSTEM_LANG_TO_LOCALE[lang] && !x.localService)[0],
        );
      })
      .catch((error) => {
        console.log("error", error);
      });
  });
  return (
    <Box
      title={
        !voice
          ? translate("general.voice_not_available", { language: LOCALES.filter((x) => x.locale === fromLang)[0].name })
          : translate("general.voice_available", { language: LOCALES.filter((x) => x.locale === fromLang)[0].name })
      }
      sx={{ marginLeft: ".5em" }}
    >
      {voice ? (
        <Button
          sx={{
            ...{ lineHeight: "1.25em", fontSize: "1em" },
            ...(sound?.length ? { textTransform: "none", padding: "0" } : {}),
          }}
          onClick={() => say(graph, lang, voice)}
          size="small"
          variant="outlined"
          color="primary"
        >
          {sound
            ? sound.map((s, index) => <SoundBox key={`${s}${index}`} sound={s} index={index} />)
            : translate("buttons.general.say_it")}
        </Button>
      ) : (
        sound?.map((s, index) => <SoundBox key={`${s}${index}`} sound={s} index={index} />)
      )}
    </Box>
  );
}
