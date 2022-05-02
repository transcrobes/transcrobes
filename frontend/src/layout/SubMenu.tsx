import ExpandMore from "@mui/icons-material/ExpandMore";
import { Collapse, List, ListItemIcon, MenuItem, Tooltip, Typography } from "@mui/material";
import { Fragment, ReactElement } from "react";
import { useSidebarState, useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  icon: { minWidth: theme.spacing(5) },
  sidebarIsOpen: {
    "& a": {
      paddingLeft: theme.spacing(4),
      transition: "padding-left 195ms cubic-bezier(0.4, 0, 0.6, 1) 0ms",
    },
  },
  sidebarIsClosed: {
    "& a": {
      paddingLeft: theme.spacing(2),
      transition: "padding-left 195ms cubic-bezier(0.4, 0, 0.6, 1) 0ms",
    },
  },
}));

interface Props {
  dense: boolean;
  handleToggle: () => void;
  icon: ReactElement;
  isOpen: boolean;
  name: string;
  children?: React.ReactNode;
}

export default function SubMenu({ handleToggle, isOpen, name, icon, children, dense }: Props): ReactElement {
  const translate = useTranslate();
  const { classes } = useStyles();
  // const sidebarIsOpen = useSelector<ReduxState, boolean>((state) => state.admin.ui.sidebarOpen);
  const sidebarIsOpen = useSidebarState();
  const header = (
    <MenuItem dense={dense} onClick={handleToggle}>
      <ListItemIcon className={classes.icon}>{isOpen ? <ExpandMore /> : icon}</ListItemIcon>
      <Typography variant="inherit" color="textSecondary">
        {translate(name)}
      </Typography>
    </MenuItem>
  );

  return (
    <Fragment>
      {sidebarIsOpen || isOpen ? (
        header
      ) : (
        <Tooltip title={translate(name)} placement="right">
          {header}
        </Tooltip>
      )}
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List
          dense={dense}
          component="div"
          disablePadding
          className={sidebarIsOpen ? classes.sidebarIsOpen : classes.sidebarIsClosed}
        >
          {children}
        </List>
      </Collapse>
    </Fragment>
  );
}
