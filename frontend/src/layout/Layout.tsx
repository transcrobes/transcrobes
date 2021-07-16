import { ReactElement } from "react";
import { useSelector } from "react-redux";
import { Layout, LayoutProps, Sidebar } from "react-admin";
import AppBar from "./AppBar";
import Menu from "./Menu";
import { darkTheme, lightTheme } from "./themes";
import { AppState } from "../lib/types";

const CustomSidebar = (props: any) => <Sidebar {...props} size={200} />;

export default function TCLayout(props: LayoutProps): ReactElement {
  const theme = useSelector((state: AppState) => (state.theme === "dark" ? darkTheme : lightTheme));
  return <Layout {...props} appBar={AppBar} sidebar={CustomSidebar} menu={Menu} theme={theme} />;
}
