import { ReactElement } from "react";
import { useSelector, useDispatch } from "react-redux";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import { useTranslate, Title, TopToolbar } from "react-admin";
import { makeStyles } from "@material-ui/core/styles";
import { changeTheme } from "../system/actions";
import { AppState, ThemeName } from "../lib/types";
import { CardHeader } from "@material-ui/core";
import HelpButton from "../components/HelpButton";

const useStyles = makeStyles({
  label: { width: "10em", display: "inline-block" },
  button: { margin: "1em" },
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});

function Configuration(): ReactElement {
  const translate = useTranslate();
  // const locale = useLocale();
  // const setLocale = useSetLocale();
  const classes = useStyles();
  const theme = useSelector((state: AppState) => state.theme);
  const dispatch = useDispatch();

  function handleUpdate(mode: ThemeName) {
    localStorage.setItem("mode", mode); // a bit hacky, probably better somewhere else
    return dispatch(changeTheme(mode));
  }
  const helpUrl = "https://transcrob.es/page/software/configure/preferences";

  return (
    <div>
      <TopToolbar className={classes.toolbar}>
        <CardHeader title="User preferences" />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Card>
        <Title title={translate("pos.configuration")} />
        <CardContent>
          <div className={classes.label}>{translate("pos.theme.name")}</div>
          <Button
            variant="contained"
            className={classes.button}
            color={theme === "light" ? "primary" : "default"}
            onClick={() => handleUpdate("light")}
          >
            {translate("pos.theme.light")}
          </Button>
          <Button
            variant="contained"
            className={classes.button}
            color={theme === "dark" ? "primary" : "default"}
            onClick={() => handleUpdate("dark")}
          >
            {translate("pos.theme.dark")} (Beta!)
          </Button>
        </CardContent>
        {/* no translations for now
            <CardContent>
                <div className={classes.label}>{translate('pos.language')}</div>
                <Button
                    variant="contained"
                    className={classes.button}
                    color={locale === 'en' ? 'primary' : 'default'}
                    onClick={() => setLocale('en')}
                >
                    en
                </Button>
                <Button
                    variant="contained"
                    className={classes.button}
                    color={locale === 'fr' ? 'primary' : 'default'}
                    onClick={() => setLocale('fr')}
                >
                    fr
                </Button>
            </CardContent> */}
      </Card>
    </div>
  );
}

export default Configuration;
