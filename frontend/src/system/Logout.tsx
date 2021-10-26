import * as React from "react";
import { FunctionComponent, ReactElement } from "react";
import PropTypes from "prop-types";
import { ListItemIcon, MenuItem, useMediaQuery } from "@material-ui/core";
import { MenuItemProps } from "@material-ui/core/MenuItem";
import { Theme, makeStyles } from "@material-ui/core/styles";

import ExitIcon from "@material-ui/icons/PowerSettingsNew";
import classnames from "classnames";
import { useTranslate, useLogout } from "ra-core";
import { ServiceWorkerProxy } from "../lib/proxies";

/*
 * Copy pasted from https://raw.githubusercontent.com/marmelab/react-admin/43c4fafc8bcedebc386c7d3dc3b63cfd56420a17/packages/ra-ui-materialui/src/auth/Logout.tsx
 * so we can call the service worker on logout to clear the current loaded database
 */

interface Props {
  proxy: ServiceWorkerProxy;
  className?: string;
  redirectTo?: string;
  icon?: ReactElement;
}

const useStyles = makeStyles(
  (theme: Theme) => ({
    menuItem: {
      color: theme.palette.text.secondary,
    },
    icon: { minWidth: theme.spacing(5) },
  }),
  { name: "RaLogout" },
);

/**
 * Logout button component, to be passed to the Admin component
 *
 * Used for the Logout Menu item in the sidebar
 */
const LogoutWithRef: FunctionComponent<
  Props & MenuItemProps<"li", { button: true }> // HACK: https://github.com/mui-org/material-ui/issues/16245
> = React.forwardRef(function Logout(props, ref) {
  const { className, classes: classesOverride, redirectTo, icon, proxy, ...rest } = props;
  const classes = useStyles(props);
  const isXSmall = useMediaQuery((theme: Theme) => theme.breakpoints.down("xs"));
  const translate = useTranslate();
  const logout = useLogout();
  // const handleClick = useCallback(() => logout(null, redirectTo, false), [redirectTo, logout]);
  function handleClick() {
    proxy.sendMessagePromise<string>({ source: "Logout", type: "resetDBConnections", value: "" });
    return logout(null, redirectTo, false);
  }
  return (
    <MenuItem
      className={classnames("logout", classes.menuItem, className)}
      onClick={handleClick}
      ref={ref}
      component={isXSmall ? "span" : "li"}
      {...rest}
    >
      <ListItemIcon className={classes.icon}>{icon ? icon : <ExitIcon />}</ListItemIcon>
      {translate("ra.auth.logout")}
    </MenuItem>
  );
});

LogoutWithRef.propTypes = {
  className: PropTypes.string,
  redirectTo: PropTypes.string,
  icon: PropTypes.element,
};

export default LogoutWithRef;
