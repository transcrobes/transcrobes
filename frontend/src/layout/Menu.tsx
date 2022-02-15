import { makeStyles } from "@material-ui/core/styles";
import OpenInBrowserIcon from "@material-ui/icons/OpenInBrowser";
import classnames from "classnames";
import { ReactElement, useState } from "react";
import { DashboardMenuItem, MenuItemLink, MenuProps, ReduxState, useTranslate, WithPermissions } from "react-admin";
import { useSelector } from "react-redux";
import { useAppSelector } from "../app/hooks";
import contents from "../contents";
import textcrobes from "../contents/textcrobes";
import goals from "../goals";
import help from "../help";
import imports from "../imports";
import listrobes from "../listrobes";
import notrobes from "../notrobes";
import repetrobes from "../repetrobes";
import stats from "../stats";
import surveys from "../surveys";
import system from "../system";
import userlists from "../userlists";
import SubMenu from "./SubMenu";

type MenuName = "menuInput" | "menuOrganisation" | "menuLearning" | "menuSurveys";

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

function Menu({ dense = false }: MenuProps): ReactElement {
  const [state, setState] = useState({
    menuInput: true,
    menuOrganisation: true,
    menuLearning: true,
    menuSurveys: true,
  });
  const translate = useTranslate();
  useAppSelector((state) => state.theme); // force rerender on theme change
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
                  to={`/stats`}
                  primaryText={translate(`resources.stats.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<stats.icon />}
                  dense={dense}
                />
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
                  to={`/textcrobes`}
                  primaryText={translate(`resources.textcrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<textcrobes.icon />}
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
              <MenuItemLink
                to={`/help`}
                primaryText={translate(`resources.help.name`, {
                  smart_count: 2,
                })}
                leftIcon={<help.icon />}
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

export default Menu;
