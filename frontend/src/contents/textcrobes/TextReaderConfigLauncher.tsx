import { Box, Drawer } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import SettingsIcon from "@mui/icons-material/Settings";
import { ReactElement, useState } from "react";
import { Button, useTranslate } from "react-admin";
import useWindowDimensions from "../../hooks/WindowDimensions";
import ReaderConfig, { ContentConfigProps } from "../common/ContentConfig";

const useStyles = makeStyles()((theme) => ({
  button: {
    [theme.breakpoints.down("md")]: {
      "& svg": {
        fontSize: 15,
      },
    },
    [theme.breakpoints.up("sm")]: {
      "& svg": {
        fontSize: 30,
      },
    },
  },
}));

export default function ContentConfigLauncher({ ...props }: ContentConfigProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { classes } = useStyles();
  const open = Boolean(anchorEl);
  const dimensions = useWindowDimensions();
  const width = dimensions.width < 600 ? dimensions.width * 0.8 : "inherit";
  const translate = useTranslate();

  function handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    setAnchorEl(event.currentTarget as HTMLElement);
  }
  function handleClose(): void {
    setAnchorEl(null);
  }
  return (
    <>
      <Button
        className={classes.button}
        children={<SettingsIcon />}
        label={translate("screens.textcrobes.settings")}
        onClick={handleClick}
      />
      <Drawer container={props.containerRef?.current} anchor="left" open={open} onClose={handleClose}>
        <Box sx={{ width: width }} role="presentation">
          <ReaderConfig containerRef={props.containerRef} {...props} />
        </Box>
      </Drawer>
    </>
  );
}
