import { PaletteType } from "@material-ui/core";

// FIXME: find out why this doesn't work, a
// import notasansregular from "../css/NotoSansSC-Regular.otf";
// const notafont = {
//   fontFamily: "notasansregular",
//   fontStyle: "normal",
//   fontWeight: "normal",
//   src: `
//     url(${notasansregular}) format('opentype')
//   `,
// };

export const darkTheme = {
  palette: {
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#FBBA72",
    },
    type: "dark" as PaletteType, // Switching the dark mode on is a single property value change.
  },
  typography: {
    fontFamily: ["Roboto", "Helvetica", "Arial", "sans-serif", "notasansregular"].join(","),
  },
  overrides: {
    // FIXME: find out why this doesn't work, a
    // MuiCssBaseline: {
    //   "@global": {
    //     "@font-face": [notafont],
    //   },
    // },
    MuiAppBar: {
      colorSecondary: {
        color: "#ffffffb3",
        backgroundColor: "#616161e6",
      },
    },
    // No idea why this is necessary...
    RaSidebar: {
      fixed: { height: "calc(100vh - 4em)" },
      root: { height: "calc(100vh - 4em)" },
    },
    MuiButtonBase: {
      root: {
        "&:hover:active::after": {
          // recreate a static ripple color
          // use the currentColor to make it work both for outlined and contained buttons
          // but to dim the background without dimming the text,
          // put another element on top with a limited opacity
          content: '""',
          display: "block",
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          right: 0,
          backgroundColor: "currentColor",
          opacity: 0.3,
          borderRadius: "inherit",
        },
      },
    },
  },
  props: {
    MuiButtonBase: {
      // disable ripple for perf reasons
      disableRipple: true,
    },
  },
};

export const lightTheme = {
  palette: {
    primary: {
      main: "#4f3cc9",
    },
    secondary: {
      light: "#5f5fc4",
      main: "#283593",
      dark: "#001064",
      contrastText: "#fff",
    },
    background: {
      default: "#fcfcfe",
    },
    type: "light" as PaletteType,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: ["Roboto", "Helvetica", "Arial", "sans-serif", "notasansregular"].join(","),
  },
  overrides: {
    // FIXME: find out why this doesn't work, a
    // MuiCssBaseline: {
    //   "@global": {
    //     "@font-face": [notafont],
    //   },
    // },
    RaMenuItemLink: {
      root: {
        borderLeft: "3px solid #fff",
      },
      active: {
        borderLeft: "3px solid #4f3cc9",
      },
    },
    // No idea why this is necessary...
    RaSidebar: {
      fixed: { height: "calc(100vh - 4em)" },
      root: { height: "calc(100vh - 4em)" },
    },
    MuiPaper: {
      elevation1: {
        boxShadow: "none",
      },
      root: {
        border: "1px solid #e0e0e3",
        backgroundClip: "padding-box",
      },
    },
    MuiButton: {
      contained: {
        backgroundColor: "#fff",
        color: "#4f3cc9",
        boxShadow: "none",
      },
    },
    MuiButtonBase: {
      root: {
        "&:hover:active::after": {
          // recreate a static ripple color
          // use the currentColor to make it work both for outlined and contained buttons
          // but to dim the background without dimming the text,
          // put another element on top with a limited opacity
          content: '""',
          display: "block",
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          right: 0,
          backgroundColor: "currentColor",
          opacity: 0.3,
          borderRadius: "inherit",
        },
      },
    },
    MuiAppBar: {
      colorSecondary: {
        color: "#808080",
        backgroundColor: "#fff",
      },
    },
    MuiLinearProgress: {
      colorPrimary: {
        backgroundColor: "#f5f5f5",
      },
      barColorPrimary: {
        backgroundColor: "#d7d7d7",
      },
    },
    MuiFilledInput: {
      root: {
        backgroundColor: "rgba(0, 0, 0, 0.04)",
        "&$disabled": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
      },
    },
    MuiSnackbarContent: {
      root: {
        border: "none",
      },
    },
  },
  props: {
    MuiButtonBase: {
      // disable ripple for perf reasons
      disableRipple: true,
    },
  },
};
