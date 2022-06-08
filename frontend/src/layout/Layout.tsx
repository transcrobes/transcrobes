import { ReactElement } from "react";
import { Layout, LayoutProps } from "react-admin";
import Beginner from "../components/BeginnersPopup";
import AppBar from "./AppBar";
import Menu from "./Menu";

export default function TCLayout(props: LayoutProps): ReactElement {
  return (
    <Layout {...props} appBar={AppBar} menu={Menu}>
      {props.children}
      <Beginner />
    </Layout>
  );
}
