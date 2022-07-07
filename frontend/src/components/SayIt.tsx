import { Button } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect, useState } from "react";
import { getVoices, say } from "../lib/funclib";

type Props = {
  graph: string;
  lang?: string;
};

export default function SayIt({ graph, lang = "zh-CN" }: Props) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    getVoices()
      .then((voices) => {
        setVoice(
          voices.filter((x) => x.lang === lang && !x.localService)[0] || voices.filter((x) => x.lang === lang)[0],
        );
      })
      .catch((error) => {
        console.log("error", error);
      });
  });
  return voice ? (
    <Box sx={{ marginLeft: ".5em" }}>
      <Button onClick={() => say(graph, voice, lang)} variant="contained" color="primary">
        Say it!
      </Button>
    </Box>
  ) : (
    <></>
  );
}
