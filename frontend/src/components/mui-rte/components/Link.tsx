import { Link as MuiLink } from "@mui/material";
import { ContentState } from "draft-js";
import React from "react";

type TLinkProps = {
  children?: React.ReactNode;
  contentState: ContentState;
  entityKey: string;
};

const Link = ({ contentState, entityKey, children }: TLinkProps) => {
  const { url, className } = contentState.getEntity(entityKey).getData();
  return (
    <MuiLink
      href={url}
      className={`${className} editor-anchor`}
      target="_blank"
    >
      {children}
    </MuiLink>
  );
};

export default Link;
