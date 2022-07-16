import YouTubeIcon from "@mui/icons-material/YouTube";
import { Box } from "@mui/system";
import { Button as RAButton } from "react-admin";

interface Props {
  url: string;
  size?: "small" | "medium" | "large";
}
export default function WatchDemo({ url, size = "small" }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <RAButton size={size} label="Watch Demo" onClick={() => window.open(url, "_blank")} children={<YouTubeIcon />} />
    </Box>
  );
}
