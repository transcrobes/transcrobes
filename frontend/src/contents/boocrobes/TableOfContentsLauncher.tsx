import TocIcon from "@mui/icons-material/Toc";
import { Box, Drawer, MenuItem, MenuList } from "@mui/material";
import React, { ReactElement } from "react";
import { Button, useTranslate } from "react-admin";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { bookReaderActions } from "../../features/content/bookReaderSlice";
import useWindowDimensions from "../../hooks/WindowDimensions";
import { ContentParams } from "../../lib/types";
import { ReadiumLink } from "../../lib/WebpubManifestTypes/ReadiumLink";
import { WebpubManifest } from "../../lib/WebpubManifestTypes/WebpubManifest";

type Props = {
  manifest: WebpubManifest;
  onClickChapter: () => void;
};

function TableOfContents({ manifest, onClickChapter }: Props): ReactElement {
  const dispatch = useAppDispatch();

  const { id = "" } = useParams<ContentParams>();
  const tocLinkHandler = (href: string) => {
    dispatch(bookReaderActions.setCurrentTocUrl({ id: id, value: href }));
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
          <MenuItem key={content.title} aria-label={content.title} onClick={() => tocLinkHandler(getLinkHref(content))}>
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
  manifest: WebpubManifest;
};

export default function TableOfContentsLauncher({ manifest }: TableOfContentsLauncherProps): ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const translate = useTranslate();

  // TODO: work out how to do this as proper functions!
  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" || (event as React.KeyboardEvent).key === "Shift")
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
        label={translate("screens.boocrobes.config.table_of_contents")}
        onClick={toggleDrawer(true)}
      />
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: dimensions.width * 0.8 }} role="presentation">
          <TableOfContents manifest={manifest} onClickChapter={() => setIsOpen(false)} />
        </Box>
      </Drawer>
    </>
  );
}
