import { ReactElement } from "react";
import { Layout, LayoutProps } from "react-admin";
import Beginner from "../components/BeginnersPopup";
import CustomAppBar from "./AppBar";
import Menu from "./Menu";

export default function TCLayout(props: LayoutProps): ReactElement {
  return (
    <Layout {...props} appBar={CustomAppBar} menu={Menu}>
      {props.children}
      <Beginner />
    </Layout>
  );
}
