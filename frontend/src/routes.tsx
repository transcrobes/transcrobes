import { Route } from "react-router-dom";
import { CustomRoutes, RouteWithoutLayout } from "react-admin";

import Configuration from "./configuration/Configuration";
import System from "./system/System";
import Help from "./help/Help";
import Init from "./system/Init";
import Listrobes from "./listrobes/listrobes";
import Repetrobes from "./repetrobes/Repetrobes";
import Notrobes from "./notrobes/Notrobes";
import Brocrobes from "./Brocrobes";
import VideoPlayer from "./contents/video/VideoPlayerScreen";
import Reader from "./contents/books/Reader";
import { USER_STATS_MODE } from "./lib/lib";
import { ComponentsConfig } from "./lib/complexTypes";
import Signup from "./system/Signup";
import ResetPassword from "./system/ResetPassword";
import RecoverPassword from "./system/RecoverPassword";

// FIXME: I guess this is better done via redux?
window.readerConfig = {
  segmentation: true,
  glossing: USER_STATS_MODE.L1,
  popupParent: window.document.body,
};

export default function routes(config: ComponentsConfig): CustomRoutes {
  return [
    // no auth
    <RouteWithoutLayout exact path="/reset-password" render={() => <ResetPassword />} noLayout />,
    <RouteWithoutLayout
      exact
      path="/recover-password"
      render={() => <RecoverPassword />}
      noLayout
    />,
    <RouteWithoutLayout exact path="/signup" render={() => <Signup />} noLayout />,

    // manual auth in the page
    <RouteWithoutLayout exact path="/contents/:id/read" render={() => <Reader />} noLayout />,
    <RouteWithoutLayout exact path="/init" render={() => <Init />} noLayout />,

    // authed
    <Route exact path="/configuration" render={() => <Configuration />} />,
    <Route exact path="/listrobes" render={() => <Listrobes proxy={config.proxy} />} />,
    <Route exact path="/repetrobes" render={() => <Repetrobes proxy={config.proxy} />} />,
    <Route
      exact
      path="/notrobes"
      render={() => <Notrobes proxy={config.proxy} url={config.url} />}
    />,
    <Route exact path="/brocrobes" render={() => <Brocrobes />} />,
    <Route
      exact
      path="/contents/:id/watch"
      children={<VideoPlayer proxy={config.proxy} dataProvider={config.dataProvider} />}
    />,
    <Route exact path="/system" render={() => <System proxy={config.proxy} />} />,
    <Route exact path="/help" render={() => <Help />} />,
  ];
}
