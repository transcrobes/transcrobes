import { Box } from "@mui/system";
import { useAppSelector } from "../app/hooks";
import { hasTones, soundWithSeparators, toneColour } from "../lib/funclib";

export interface Props {
  sound: string;
  graph?: string;
  index: number;
}

export default function SoundBox({ sound, index, graph }: Props) {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <Box component="span" sx={{ color: hasTones(fromLang) ? toneColour(sound) : undefined }}>
      {graph || soundWithSeparators(sound, index, fromLang)}
    </Box>
  );
}
