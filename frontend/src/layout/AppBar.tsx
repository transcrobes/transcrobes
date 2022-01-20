import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import { AppBar, UserMenu } from "react-admin";

const useStyles = makeStyles({
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
  const classes = useStyles();
  return (
    <AppBar {...props} elevation={1} userMenu={<CustomUserMenu />}>
      <Typography variant="h6" color="inherit" className={classes.title} id="react-admin-title" />
      Transcrobes
      <span className={classes.spacer} />
    </AppBar>
  );
};

export default CustomAppBar;
