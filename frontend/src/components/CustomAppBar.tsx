import {
  AppBar as MuiAppBar,
  AppBarProps as MuiAppBarProps,
  Theme,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { ComponentPropType, useLocales } from "ra-core";
import * as React from "react";
import { Children, FC, memo } from "react";

import { HideOnScroll, LocalesMenuButton, ToggleThemeButton, UserMenu, useThemesContext } from "react-admin";
import { useAppSelector } from "../app/hooks";

export const CustomAppBar: FC<AppBarProps> = memo((props) => {
  const {
    children,
    className,
    color = "secondary",
    open,
    title,
    userMenu = DefaultUserMenu,
    container: Container = HideOnScroll,
    ...rest
  } = props;

  const locales = useLocales();
  const isXSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  const { darkTheme } = useThemesContext();
  const { loading } = useAppSelector((state) => state.ui);

  return (
    <Container className={className}>
      <StyledAppBar className={AppBarClasses.appBar} color={color} {...rest}>
        <Toolbar disableGutters variant={isXSmall ? "regular" : "dense"} className={AppBarClasses.toolbar}>
          {Children.count(children) === 0 ? (
            <Typography variant="h6" color="inherit" className={AppBarClasses.title}>
              {title}
            </Typography>
          ) : (
            children
          )}
          {!loading && locales && locales.length > 1 ? <LocalesMenuButton /> : null}
          {!loading && darkTheme && <ToggleThemeButton />}
          {typeof userMenu === "boolean" ? userMenu === true ? <UserMenu /> : null : userMenu}
        </Toolbar>
      </StyledAppBar>
    </Container>
  );
});

CustomAppBar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  color: PropTypes.oneOf(["default", "inherit", "primary", "secondary", "transparent"]),
  container: ComponentPropType,
  // @deprecated
  open: PropTypes.bool,
  userMenu: PropTypes.oneOfType([PropTypes.element, PropTypes.bool]),
};

const DefaultUserMenu = <UserMenu />;

export interface AppBarProps extends Omit<MuiAppBarProps, "title"> {
  container?: React.ElementType<any>;
  // @deprecated
  open?: boolean;
  title?: string | JSX.Element;
  userMenu?: JSX.Element | boolean;
}

const PREFIX = "RaAppBar";

export const AppBarClasses = {
  appBar: `${PREFIX}-appBar`,
  toolbar: `${PREFIX}-toolbar`,
  menuButton: `${PREFIX}-menuButton`,
  menuButtonIconClosed: `${PREFIX}-menuButtonIconClosed`,
  menuButtonIconOpen: `${PREFIX}-menuButtonIconOpen`,
  title: `${PREFIX}-title`,
};

const StyledAppBar = styled(MuiAppBar, {
  name: PREFIX,
  overridesResolver: (props, styles) => styles.root,
})(({ theme }) => ({
  [`& .${AppBarClasses.toolbar}`]: {
    display: "flex",
    justifyContent: "right",
    padding: `0 ${theme.spacing(1.5)} 0 0`,
    [theme.breakpoints.down("md")]: {
      minHeight: theme.spacing(6),
    },
  },
  [`& .${AppBarClasses.menuButton}`]: {
    marginLeft: "0.2em",
    marginRight: "0.2em",
  },
  [`& .${AppBarClasses.title}`]: {
    flex: 1,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
}));
