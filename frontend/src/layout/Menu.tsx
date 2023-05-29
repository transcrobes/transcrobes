import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import classnames from "classnames";
import { ReactElement, useState } from "react";
import {
  DashboardMenuItem,
  MenuItemLink,
  MenuProps,
  useSidebarState,
  useTranslate,
  WithPermissions,
} from "react-admin";
import { makeStyles } from "tss-react/mui";
import { useAppSelector } from "../app/hooks";
import contents from "../contents";
import textcrobes from "../contents/textcrobes";
import dictionaries from "../dictionaries";
import statsExports from "../exports";
import goals from "../goals";
import help from "../help";
import imports from "../imports";
import listrobes from "../listrobes";
import notrobes from "../notrobes";
import repetrobes from "../repetrobes";
import stats from "../stats";
import studentregistrations from "../studentregistrations";
import studentstats from "../studentstats";
import teacherregistrations from "../teacherregistrations";
import languageclasses from "../languageclasses";
import surveys from "../surveys";
import system from "../system";
import userlists from "../userlists";
import SubMenu from "./SubMenu";

type MenuName = "menuInput" | "menuOrganisation" | "menuLearning" | "menuSurveys" | "menuTeaching";

const useStyles = makeStyles()((theme) => ({
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
    menuTeaching: true,
  });
  const translate = useTranslate();
  // useAppSelector((state) => state.theme); // force rerender on theme change
  const { classes } = useStyles();
  const handleToggle = (menu: MenuName) => {
    setState((state) => ({ ...state, [menu]: !state[menu] }));
  };
  // const open = useSelector((state: ReduxState) => state.admin.ui.sidebarOpen);
  const [open] = useSidebarState();
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
        render={({ permissions }) => {
          return Array.isArray(permissions) && permissions.includes("initialised") ? (
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
                  primaryText={translate(`screens.notrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<notrobes.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/listrobes`}
                  primaryText={translate(`screens.listrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<listrobes.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/userdictionaries`}
                  primaryText={translate(`resources.userdictionaries.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<dictionaries.icon />}
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
                  to={`/studentregistrations`}
                  primaryText={translate(`resources.studentregistrations.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<studentregistrations.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/stats`}
                  primaryText={translate(`screens.stats.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<stats.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/exports`}
                  primaryText={translate(`screens.exports.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<statsExports.icon />}
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
                  primaryText={translate(`screens.repetrobes.name`, {
                    smart_count: 2,
                  })}
                  leftIcon={<repetrobes.icon />}
                  dense={dense}
                />
                <MenuItemLink
                  to={`/textcrobes`}
                  primaryText={translate(`screens.textcrobes.name`, {
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
                  primaryText={translate(`screens.brocrobes.name`, {
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
              {permissions.includes("teacher") && (
                <SubMenu
                  handleToggle={() => handleToggle("menuTeaching")}
                  isOpen={state.menuTeaching}
                  name="pos.menu.teaching"
                  icon={<teacherregistrations.icon />}
                  dense={dense}
                >
                  <MenuItemLink
                    to={`/teacherregistrations`}
                    primaryText={translate(`resources.teacherregistrations.name`, {
                      smart_count: 2,
                    })}
                    leftIcon={<teacherregistrations.icon />}
                    dense={dense}
                  />
                  <MenuItemLink
                    to={`/languageclasses`}
                    primaryText={translate(`resources.languageclasses.name`, {
                      smart_count: 2,
                    })}
                    leftIcon={<languageclasses.icon />}
                    dense={dense}
                  />
                  <MenuItemLink
                    to={`/studentstats`}
                    primaryText={translate(`screens.studentstats.name`, {
                      smart_count: 2,
                    })}
                    leftIcon={<studentstats.icon />}
                    dense={dense}
                  />
                </SubMenu>
              )}
              <MenuItemLink
                to={`/system`}
                primaryText={translate(`screens.system.name`, {
                  smart_count: 2,
                })}
                leftIcon={<system.icon />}
                dense={dense}
              />
              <MenuItemLink
                to={`/help`}
                primaryText={translate(`screens.help.name`, {
                  smart_count: 2,
                })}
                leftIcon={<help.icon />}
                dense={dense}
              />
            </>
          ) : (
            <></>
          );
        }}
      />
    </div>
  );
}

export default Menu;
