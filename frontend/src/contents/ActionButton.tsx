import EnrichIcon from "@mui/icons-material/Add";
import ReadIcon from "@mui/icons-material/LocalLibrary";
import WatchIcon from "@mui/icons-material/Theaters";
import dayjs from "dayjs";
import { ReactElement, useEffect, useState } from "react";
import { Button, Identifier, useRecordContext } from "react-admin";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { Content, CONTENT_TYPE, Import, PROCESSING } from "../lib/types";

const DATA_SOURCE = "ActionButton.tsx";
type Verb = "Watch" | "Read" | "Enrich" | "Resubmit" | "";

function action(id: Identifier, verb: Verb, navigate: NavigateFunction) {
  if (verb === "Enrich" || verb === "Resubmit") {
    window.componentsConfig.proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "submitContentEnrichRequest",
      value: { contentId: id.toString() },
    });
  } else {
    navigate(`/contents/${id.toString()}/${verb.toLowerCase()}`);
  }
}

export default function ActionButton({ label }: { label?: string }): ReactElement {
  const content = useRecordContext<Content>();
  const [verb, setVerb] = useState<Verb>("");
  const [Icon, setIcon] = useState<ReactElement>(<></>);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (content.processing === PROCESSING.FINISHED) {
        if (content.contentType === CONTENT_TYPE.BOOK) {
          setVerb("Read");
          setIcon(<ReadIcon />);
        } else {
          setVerb("Watch");
          setIcon(<WatchIcon />);
        }
      } else if (content.processing === PROCESSING.NONE) {
        const theImport = (
          await window.componentsConfig.proxy.sendMessagePromise<Import[]>({
            source: DATA_SOURCE,
            type: "getByIds",
            value: { collection: "imports", ids: [content.theImport.toString()] },
          })
        )[0];
        if (theImport && theImport.processing === PROCESSING.FINISHED) {
          setVerb("Enrich");
          setIcon(<EnrichIcon />);
        }
      } else if (
        content.processing === PROCESSING.ERROR ||
        (content.processing === PROCESSING.REQUESTED && (content.updatedAt || 0) < dayjs().add(-10, "minutes").unix())
      ) {
        setVerb("Resubmit");
        setIcon(<EnrichIcon />);
      }
    })();
  }, [content.processing]);
  return verb ? (
    <Button
      children={Icon}
      label={verb}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        action(content.id, verb, navigate);
        setVerb("");
        setIcon(<></>);
      }}
    />
  ) : (
    <></>
  );
}
