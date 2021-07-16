import { ReactElement } from "react";
import { Button, Identifier, Link, useRecordContext } from "react-admin";
import { Content, CONTENT_TYPE, PROCESSING } from "../lib/types";

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
    const verb = content.contentType === CONTENT_TYPE.BOOK ? "Read" : "Watch";
    return (
      <Button label={verb} component={Link} to={`/contents/${content.id}/${verb.toLowerCase()}`} />
    );
  } else {
    const verb = content.processing === PROCESSING.NONE ? "Enrich" : "";
    return <Button label={verb} onClick={() => enrich(content.id)} />;
  }
}

export default ActionButton;
