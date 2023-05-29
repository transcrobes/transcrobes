import { Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { AppBar, AppBarProps, UserMenu } from "react-admin";
import CustomToolbar from "./CustomToolbar";

export default function CustomAppBar(props: AppBarProps) {
  // DO NOT REMOVE THIS! It's needed to focus the title on navigation, which enables events
  // for the activity tracker to work.
  const inputReference = useRef(null);
  useEffect(() => {
    // @ts-ignore
    inputReference?.current?.focus();
  }, []);
  return (
    <AppBar {...props} toolbar={<CustomToolbar />} elevation={1} userMenu={<UserMenu />}>
      <Typography
        sx={{
          flex: 1,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
        ref={inputReference}
        variant="h6"
        color="inherit"
        id="react-admin-title"
      />
      Transcrobes
      <Box
        component="span"
        sx={{
          flex: 1,
        }}
      />
    </AppBar>
  );
}
