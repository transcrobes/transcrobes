import { ReactElement } from "react";
import { useSelector, useDispatch } from "react-redux";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import { useTranslate, Title } from "react-admin";
import { makeStyles } from "@material-ui/core/styles";
import { changeTheme } from "./actions";
import { AppState, ThemeName } from "../lib/types";

const useStyles = makeStyles({
  label: { width: "10em", display: "inline-block" },
  button: { margin: "1em" },
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

  return (
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
          {translate("pos.theme.dark")}
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
  );
}

export default Configuration;
