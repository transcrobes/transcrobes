import { ReactElement, useState } from "react";
import { useSelector } from "react-redux";
import OpenInBrowserIcon from "@material-ui/icons/OpenInBrowser";
import { makeStyles } from "@material-ui/core/styles";
import {
  useTranslate,
  DashboardMenuItem,
  MenuItemLink,
  MenuProps,
  WithPermissions,
  ReduxState,
} from "react-admin";
import classnames from "classnames";

import imports from "../imports";
import userlists from "../userlists";
import goals from "../goals";
import contents from "../contents";
import surveys from "../surveys";
import listrobes from "../listrobes";
import notrobes from "../notrobes";
import repetrobes from "../repetrobes";
import system from "../system";

import SubMenu from "./SubMenu";
import { AppState } from "../lib/types";

type MenuName = "menuInput" | "menuOrganisation" | "menuLearning" | "menuSurveys";

function Menu({ dense = false }: MenuProps): ReactElement {
  const [state, setState] = useState({
    menuInput: true,
    menuOrganisation: true,
    menuLearning: true,
    menuSurveys: true,
  });
  const translate = useTranslate();
  useSelector((state: AppState) => state.theme); // force rerender on theme change
  const classes = useStyles();

  const handleToggle = (menu: MenuName) => {
    setState((state) => ({ ...state, [menu]: !state[menu] }));
  };
  const open = useSelector((state: ReduxState) => state.admin.ui.sidebarOpen);

  return (
    <div
      className={classnames(classes.root, {
        [classes.open]: open,
        [classes.closed]: !open,
      })}
    >
      {" "}
      <DashboardMenuItem />
      <WithPermissions
        render={({ permissions }) =>
          Array.isArray(permissions) && permissions.includes("initialised") ? (
            // <MenuItemLink to="/custom-route" primaryText="Miscellaneous" />
            <>
              <SubMenu
                handleToggle={() => handleToggle("menuInput")}
                isOpen={state.menuInput}
                name="pos.menu.input"
                icon={<imports.icon />}
                dense={dense}
              >
                <MenuItemLink
                  to={`/imports`}
                  primaryText={translate(`resources.imports.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<imports.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/notrobes`}
                  primaryText={translate(`resources.notrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<notrobes.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/listrobes`}
                  primaryText={translate(`resources.listrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<listrobes.icon />}
                  dense={dense}
                />
              </SubMenu>
              <SubMenu
                handleToggle={() => handleToggle("menuOrganisation")}
                isOpen={state.menuOrganisation}
                name="pos.menu.organisation"
                icon={<goals.icon />}
                dense={dense}
              >
                <MenuItemLink
                  to={`/goals`}
                  primaryText={translate(`resources.goals.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<goals.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/userlists`}
                  primaryText={translate(`resources.userlists.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<userlists.icon />}
                  dense={dense}
                />
              </SubMenu>
              <SubMenu
                handleToggle={() => handleToggle("menuLearning")}
                isOpen={state.menuLearning}
                name="pos.menu.learning"
                icon={<repetrobes.icon />}
                dense={dense}
              >
                <MenuItemLink
                  to={`/repetrobes`}
                  primaryText={translate(`resources.repetrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<repetrobes.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/contents`}
                  primaryText={translate(`resources.contents.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<contents.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/brocrobes`}
                  primaryText={translate(`resources.brocrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<OpenInBrowserIcon />}
                  dense={dense}
                />
              </SubMenu>
              <MenuItemLink
                to={`/surveys`}
                primaryText={translate(`resources.surveys.name`, {
                  smart_count: 2,
                })}
                leftIcon={<surveys.icon />}
                dense={dense}
              />
              <MenuItemLink
                to={`/system`}
                primaryText={translate(`resources.system.name`, {
                  smart_count: 2,
                })}
                leftIcon={<system.icon />}
                dense={dense}
              />
            </>
          ) : (
            <></>
          )
        }
      />
    </div>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  open: {
    width: 200,
  },
  closed: {
    width: 55,
  },
}));

export default Menu;
