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
  typography: {
    fontFamily: ["Roboto", "Helvetica", "Arial", "sans-serif", "notasansregular"].join(","),
  },
  palette: {
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#FBBA72",
    },
    mode: "dark" as const, // Switching the dark mode on is a single property value change.
  },
  sidebar: {
    width: 200,
  },
  components: {
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          borderLeft: "3px solid #000",
          "&.RaMenuItemLink-active": {
            borderLeft: "3px solid #90caf9",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorSecondary: {
          color: "#ffffffb3",
          backgroundColor: "#616161e6",
        },
      },
    },
    // No idea why this is necessary...
    // RaSidebar: {
    //   fixed: { height: "calc(100vh - 4em)" },
    //   root: { height: "calc(100vh - 4em)" },
    // },
    MuiButtonBase: {
      defaultProps: {
        // disable ripple for perf reasons
        disableRipple: true,
      },
      styleOverrides: {
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
  },
};

const popupOverrides = {
  typography: {
    fontSize: 16,
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
    MuiScopedCssBaseline: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }: any) => ({
          [theme.breakpoints.down("sm")]: {
            padding: 8,
          },
        }),
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: ({ theme }: any) => ({
          [theme.breakpoints.down("sm")]: {
            padding: "8px 8px 0px",
          },
          paddingBottom: 0,
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }: any) => ({
          fontSize: 16,
          [theme.breakpoints.down("sm")]: {
            padding: 8,
          },
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: 24,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
  },
};
export const popupDarkTheme = {
  ...darkTheme,
  components: { ...darkTheme.components, ...popupOverrides.components },
  typography: { ...darkTheme.typography, ...popupOverrides.typography },
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
    mode: "light" as const,
  },
  shape: {
    borderRadius: 10,
  },
  sidebar: {
    width: 200,
  },
  components: {
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          borderLeft: "3px solid #fff",
          "&.RaMenuItemLink-active": {
            borderLeft: "3px solid #4f3cc9",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: "none",
        },
        root: {
          border: "1px solid #e0e0e3",
          backgroundClip: "padding-box",
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        // disable ripple for perf reasons
        disableRipple: true,
      },
      styleOverrides: {
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
    MuiAppBar: {
      styleOverrides: {
        colorSecondary: {
          color: "#808080",
          backgroundColor: "#fff",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: "#f5f5f5",
        },
        barColorPrimary: {
          backgroundColor: "#d7d7d7",
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
          "&$disabled": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          border: "none",
        },
      },
    },
  },
};

export const popupLightTheme = {
  ...lightTheme,
  components: { ...darkTheme.components, ...popupOverrides.components },
  typography: { ...darkTheme.typography, ...popupOverrides.typography },
};
