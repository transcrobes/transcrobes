import { CustomRoutes, RouteWithoutLayout } from "react-admin";
import { Route } from "react-router-dom";
import Brocrobes from "./Brocrobes";
import Reader from "./contents/boocrobes/BookReader";
import VideoPlayerScreen from "./contents/moocrobes/VideoPlayerScreen";
import Textcrobes from "./contents/textcrobes/Textcrobes";
import Exports from "./exports/Exports";
import Help from "./help/Help";
import { ComponentsConfig } from "./lib/complexTypes";
import Listrobes from "./listrobes/Listrobes";
import Notrobes from "./notrobes/Notrobes";
import Repetrobes from "./repetrobes/Repetrobes";
import Stats from "./stats/Stats";
import Init from "./system/Init";
import RecoverPassword from "./system/RecoverPassword";
import ResetPassword from "./system/ResetPassword";
import Signup from "./system/Signup";
import System from "./system/System";

export default function routes(config: ComponentsConfig): CustomRoutes {
  return [
    // no auth
    <RouteWithoutLayout exact path="/reset-password" render={() => <ResetPassword />} noLayout />,
    <RouteWithoutLayout exact path="/recover-password" render={() => <RecoverPassword />} noLayout />,
    <RouteWithoutLayout exact path="/signup" render={() => <Signup />} noLayout />,

    // manual auth in the page
    <RouteWithoutLayout exact path="/contents/:id/read" render={() => <Reader proxy={config.proxy} />} noLayout />,
    <RouteWithoutLayout exact path="/init" render={() => <Init proxy={config.proxy} />} noLayout />,

    // authed
    <Route exact path="/notrobes" render={() => <Notrobes proxy={config.proxy} url={config.url} />} />,
    <Route exact path="/listrobes" render={() => <Listrobes proxy={config.proxy} />} />,
    <Route exact path="/stats" render={() => <Stats />} />,
    <Route exact path="/exports" render={() => <Exports proxy={config.proxy} />} />,
    <Route exact path="/repetrobes" render={() => <Repetrobes proxy={config.proxy} />} />,
    <Route exact path="/textcrobes" render={() => <Textcrobes proxy={config.proxy} />} />,
    <Route exact path="/contents/:id/watch" children={<VideoPlayerScreen proxy={config.proxy} />} />,
    <Route exact path="/brocrobes" render={() => <Brocrobes />} />,
    <Route exact path="/system" render={() => <System proxy={config.proxy} />} />,
    <Route exact path="/help" render={() => <Help />} />,
  ];
}
