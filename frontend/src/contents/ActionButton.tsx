import EnrichIcon from "@mui/icons-material/Add";
import ReadIcon from "@mui/icons-material/LocalLibrary";
import WatchIcon from "@mui/icons-material/Theaters";
import { ReactElement } from "react";
import { Button, Identifier, useRecordContext } from "react-admin";
import { Content, CONTENT_TYPE, PROCESSING } from "../lib/types";

const DATA_SOURCE = "ActionButton.tsx";

function enrich(id: Identifier) {
  window.componentsConfig.proxy.sendMessage(
    {
      source: DATA_SOURCE,
      type: "submitContentEnrichRequest",
      value: { contentId: id.toString() },
    },
    () => {
      // FIXME: there is no doubt a much nicer, React way of doing this
      window.location.reload();
      return "success";
    },
  );
}

export default function ActionButton({ label }: { label?: string }): ReactElement {
  const stopPropagation = (e: React.MouseEvent<HTMLElement>) => e.stopPropagation();

  const content = useRecordContext<Content>();
  if (content.processing === PROCESSING.FINISHED) {
    let verb = "Watch";
    let Icon = WatchIcon;
    if (content.contentType === CONTENT_TYPE.BOOK) {
      verb = "Read";
      Icon = ReadIcon;
    }
    return (
      <a href={`/#/contents/${content.id}/${verb.toLowerCase()}`}>
        <Button children={<Icon />} label={verb} onClick={stopPropagation} />
      </a>
    );
  } else if (content.processing === PROCESSING.NONE) {
    return (
      <Button
        children={<EnrichIcon />}
        label="Enrich"
        onClick={(e: React.MouseEvent<HTMLElement>) => {
          e.stopPropagation();
          enrich(content.id);
        }}
      />
    );
  } else {
    return <></>;
  }
}
