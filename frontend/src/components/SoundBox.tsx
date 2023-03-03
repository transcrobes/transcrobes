import { Box } from "@mui/system";
import { useAppSelector } from "../app/hooks";
import { hasTones, soundWithSeparators, toneColour } from "../lib/funclib";

export interface Props {
  sound: string;
  graph?: string;
  index: number;
  marginLeft?: string;
}

export default function SoundBox({ sound, index, graph, marginLeft = "0em" }: Props) {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <Box component="span" sx={{ color: hasTones(fromLang) ? toneColour(sound) : undefined, marginLeft }}>
      {graph || soundWithSeparators(sound, index, fromLang)}
    </Box>
  );
}
