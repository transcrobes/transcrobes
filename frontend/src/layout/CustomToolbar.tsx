import { LoadingIndicator, LocalesMenuButton, ToggleThemeButton, useLocales, useThemesContext } from "react-admin";
import { useAppSelector } from "../app/hooks";

export default function CustomToolbar() {
  const locales = useLocales();
  const { darkTheme } = useThemesContext();
  const { loading } = useAppSelector((state) => state.ui);
  return (
    <>
      {!loading && locales && locales.length > 1 ? <LocalesMenuButton /> : null}
      {!loading && darkTheme && <ToggleThemeButton />}
      <LoadingIndicator />
    </>
  );
}
