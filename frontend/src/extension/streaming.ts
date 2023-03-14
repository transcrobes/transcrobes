export const streamOverrides = {
  typography: {
    fontSize: 16,
  },
  components: {
    MuiGrid: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          fontSize: "inherit",
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          "@media (min-width: 0px)": {
            //minWidth: 0
            paddingLeft: 0,
            paddingRight: 0,
            maxWidth: "100%",
            // maxHeight: "calc(100vh - 64px)",
          },
        },
      },
    },
    RaButton: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: 16,
        },
      },
    },
  },
};
