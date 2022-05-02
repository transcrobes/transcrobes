import { ReactElement } from "react";
import { Layout, LayoutProps, Sidebar } from "react-admin";
import AppBar from "./AppBar";
import Menu from "./Menu";
import { darkTheme, lightTheme } from "./themes";
import { useAppSelector } from "../app/hooks";

const CustomSidebar = (props: any) => <Sidebar {...props} size={200} />;

export default function TCLayout(props: LayoutProps): ReactElement {
  const theme = useAppSelector((state) => (state.theme === "dark" ? darkTheme : lightTheme));
  // return <Layout {...props} appBar={AppBar} sidebar={CustomSidebar} menu={Menu} theme={theme} />;
  return <Layout {...props} appBar={AppBar} sidebar={CustomSidebar} menu={Menu} />;
}
