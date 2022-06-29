import { Box } from "@mui/system";
import { Button as RAButton } from "react-admin";

import YouTubeIcon from "@mui/icons-material/YouTube";
interface Props {
  url: string;
  size?: "small" | "medium" | "large";
}
export default function WatchDemo({ url, size = "small" }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <RAButton
        size={size}
        label="Watch Demo"
        onClick={() => window.open(url, "_blank")}
        children={<YouTubeIcon />}
      ></RAButton>
    </Box>
  );
}
