import { makeStyles } from "tss-react/mui";
import Typography from "@mui/material/Typography";
import { AppBar, UserMenu } from "react-admin";
import { useEffect, useRef } from "react";

const useStyles = makeStyles()({
  title: {
    flex: 1,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  spacer: {
    flex: 1,
  },
});

const CustomUserMenu = (props: any) => <UserMenu {...props} />;

const CustomAppBar = (props: any) => {
  const { classes } = useStyles();

  // DO NOT REMOVE THIS! It's needed to focus the title on navigation, which enables events
  // for the activity tracker to work.
  const inputReference = useRef(null);
  useEffect(() => {
    // @ts-ignore
    inputReference?.current?.focus();
  }, []);
  return (
    <AppBar {...props} elevation={1} userMenu={<CustomUserMenu />}>
      <Typography ref={inputReference} variant="h6" color="inherit" className={classes.title} id="react-admin-title" />
      Transcrobes
      <span className={classes.spacer} />
    </AppBar>
  );
};

export default CustomAppBar;
