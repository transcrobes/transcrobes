import { ReactElement } from "react";
import { Button, Identifier, Link, useRecordContext } from "react-admin";
import { Content, CONTENT_TYPE, PROCESSING } from "../lib/types";
import WatchIcon from "@material-ui/icons/Theaters";
import EnrichIcon from "@material-ui/icons/Add";
import ReadIcon from "@material-ui/icons/LocalLibrary";
import React from "react";

const DATA_SOURCE = "ActionButton.tsx";

function enrich(id: Identifier) {
  console.debug("Attempting to enrich", id);
  window.componentsConfig.proxy.sendMessage(
    {
      source: DATA_SOURCE,
      type: "enrich",
      value: { contentId: id.toString() },
    },
    () => {
      // FIXME: there is no doubt a much nicer, React way of doing this
      window.location.reload();
      return "success";
    },
  );
}

// FIXME: any
function ActionButton(props: any): ReactElement {
  const content = useRecordContext(props) as Content;
  if (content.processing === PROCESSING.FINISHED) {
    let verb = "Watch";
    let Icon = WatchIcon;
    if (content.contentType === CONTENT_TYPE.BOOK) {
      verb = "Read";
      Icon = ReadIcon;
    }
    return (
      <Button
        children={<Icon />}
        label={verb}
        component={Link}
        to={`/contents/${content.id}/${verb.toLowerCase()}`}
      />
    );
  } else if (content.processing === PROCESSING.NONE) {
    return <Button children={<EnrichIcon />} label="Enrich" onClick={() => enrich(content.id)} />;
  } else {
    return <></>;
  }
}

export default ActionButton;
