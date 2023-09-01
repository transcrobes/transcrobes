import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useStore, useTranslate } from "ra-core";
import { useEffect, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { getBestVoice, getVoices } from "../lib/funclib";
import { SYSTEM_LANG_TO_LOCALE } from "../lib/types";

export default function ChoosePreferredVoice() {
  const translate = useTranslate();
  const lang = useAppSelector((state) => state.userData.user.fromLang);
  const [preferredVoiceStore, setPreferredVoiceStore] = useStore("preferences.preferredVoice", "");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    getVoices().then((voices) => {
      if (!preferredVoiceStore) {
        const def = getBestVoice(voices, lang)?.name || "";
        setPreferredVoiceStore(def);
      }
      const filtered: Map<string, SpeechSynthesisVoice> = new Map();
      for (const voice of voices) {
        if (SYSTEM_LANG_TO_LOCALE[lang].find((x) => voice.lang.replace("_", "-").match(x))) {
          if (!voice.voiceURI.startsWith("com.apple.") || voice.voiceURI.startsWith("com.apple.voice.")) {
            filtered.set(voice.name, voice);
          }
        }
      }
      setVoices([...filtered.values()]);
    });
  }, []);
  function handleChange(event: SelectChangeEvent<string>) {
    setPreferredVoiceStore(event.target.value as string);
  }
  return (
    voices.length > 0 && (
      <FormControl sx={{ minWidth: "150px" }}>
        <InputLabel id="select-label">{translate("screens.system.preferred_voice")}</InputLabel>
        <Select
          labelId="select-label"
          id="simple-select"
          value={preferredVoiceStore}
          label={translate("screens.system.preferred_voice")}
          onChange={handleChange}
        >
          {voices.map((voice) => (
            <MenuItem key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  );
}
