import React, { ReactElement } from "react";
import TocIcon from "@material-ui/icons/Toc";
import { Box, Drawer, MenuItem, MenuList } from "@material-ui/core";
import { ReadiumLink } from "../WebpubManifestTypes/ReadiumLink";

import { Navigator, WebpubManifest } from "../types";
import useWindowDimensions from "../../../hooks/WindowDimensions";
import { Button } from "react-admin";

type Props = {
  navigator: Navigator;
  manifest: WebpubManifest;
  onClickChapter: () => void;
};

function TableOfContents({ navigator, manifest, onClickChapter }: Props): ReactElement {
  const tocLinkHandler = (href: string) => {
    navigator.goToPage(href);
    onClickChapter();
  };

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
          >
            {/* FIXME: make sure it's safe!!! */}
            <span dangerouslySetInnerHTML={{ __html: content.title ?? "" }} />
            {content.children && (
              <>
                {content.children.map((subLink) => (
                  <MenuItem
                    aria-label={subLink.title}
                    key={subLink.title}
                    onClick={() => tocLinkHandler(getLinkHref(subLink))}
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
type TableOfContentsLauncherProps = {
  navigator: Navigator;
  manifest: WebpubManifest;
};

export default function TableOfContentsLauncher(props: TableOfContentsLauncherProps): ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

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
    <>
      <Button
        size="large"
        children={<TocIcon />}
        label="Table of contents"
        onClick={toggleDrawer(true)}
      />
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: dimensions.width * 0.8 }} role="presentation">
          <TableOfContents {...props} onClickChapter={() => setIsOpen(false)} />
        </Box>
      </Drawer>
    </>
  );
}
