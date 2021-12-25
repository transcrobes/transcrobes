import React, { ReactElement } from "react";
import TocIcon from "@material-ui/icons/Toc";
import {
  Box,
  createStyles,
  Drawer,
  IconButton,
  makeStyles,
  MenuItem,
  MenuList,
  Theme,
} from "@material-ui/core";
import useColorModeValue from "./hooks/useColorModeValue";
import { ReadiumLink } from "../WebpubManifestTypes/ReadiumLink";

import { Navigator, WebpubManifest } from "../types";
import useWindowDimensions from "../../../hooks/WindowDimensions";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    settings: {},
  }),
);

type Props = {
  navigator: Navigator;
  manifest: WebpubManifest;
  // containerRef: React.MutableRefObject<HTMLDivElement | null>;
};

function TableOfContents({
  navigator,
  manifest,
}: //containerRef
Props): ReactElement {
  const tocLinkHandler = (href: string) => {
    navigator.goToPage(href);
  };

  const tocBgColor = useColorModeValue("ui.white", "ui.black", "ui.sepia");

  const getLinkHref = (link: ReadiumLink): string => {
    if (link.href) return link.href;
    if (!link.children) throw new Error("Manifest is not well formed");
    return getLinkHref(link.children[0]);
  };

  return (
    <MenuList>
      {manifest.toc && manifest.toc.length > 0 ? (
        manifest.toc.map((content: ReadiumLink, i) => (
          <MenuItem
            key={content.title}
            aria-label={content.title}
            onClick={() => tocLinkHandler(getLinkHref(content))}
            // html={content.title ?? ""}
          >
            <span dangerouslySetInnerHTML={{ __html: content.title ?? "" }} />
            {content.children && (
              <>
                {content.children.map((subLink) => (
                  <MenuItem
                    aria-label={subLink.title}
                    key={subLink.title}
                    onClick={() => tocLinkHandler(getLinkHref(subLink))}
                    // pl={10}
                    // html={subLink.title ?? ""}
                  >
                    <span dangerouslySetInnerHTML={{ __html: subLink.title ?? "" }} />
                  </MenuItem>
                ))}
              </>
            )}
          </MenuItem>
        ))
      ) : (
        <div>This publication does not have a Table of Contents.</div>
      )}
    </MenuList>
  );
}

export default function TableOfContentsLauncher(props: Props): ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const classes = useStyles();

  // TODO: work out how to do this as proper functions!
  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" ||
        (event as React.KeyboardEvent).key === "Shift")
    ) {
      return;
    }
    setIsOpen(open);
  };

  const dimensions = useWindowDimensions();
  return (
    <div>
      <IconButton
        className={classes.settings}
        onClick={toggleDrawer(true)}
        color="primary"
        aria-label="settings"
      >
        <TocIcon />
      </IconButton>
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: dimensions.width * 0.8 }} role="presentation">
          <TableOfContents {...props} />
        </Box>
      </Drawer>
    </div>
  );
}
