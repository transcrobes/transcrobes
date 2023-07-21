import EnrichIcon from "@mui/icons-material/Add";
import ReadIcon from "@mui/icons-material/LocalLibrary";
import WatchIcon from "@mui/icons-material/Theaters";
import dayjs from "dayjs";
import { ReactElement, useEffect, useState } from "react";
import { Button, useRecordContext, useTranslate } from "react-admin";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { CONTENT_TYPE, Content, Import, PROCESSING } from "../lib/types";
import { platformHelper } from "../app/createStore";

const DATA_SOURCE = "ActionButton.tsx";
type Verb = "Watch" | "Read" | "Enrich" | "Resubmit" | "";

function action(content: Content, verb: Verb, navigate: NavigateFunction) {
  if (verb === "Enrich" || verb === "Resubmit") {
    platformHelper.submitContentEnrichRequest({ contentId: content.id.toString() });
    return true;
  } else {
    if (verb == "Watch" && content.sourceUrl) {
      window.open(content.sourceUrl, "_blank");
    } else {
      navigate(`/contents/${content.id.toString()}/${verb.toLowerCase()}`);
    }
    return false;
  }
}

export default function ActionButton({ label }: { label?: string }): ReactElement {
  const content = useRecordContext<Content>();
  const [verb, setVerb] = useState<Verb>("");
  const [verbLabel, setVerbLabel] = useState("");
  const [Icon, setIcon] = useState<ReactElement>(<></>);
  const navigate = useNavigate();
  const translate = useTranslate();

  useEffect(() => {
    (async () => {
      if (content.processing === PROCESSING.FINISHED) {
        if (content.contentType === CONTENT_TYPE.BOOK) {
          setVerbLabel(translate("widgets.content_actions.read") as Verb);
          setVerb("Read");
          setIcon(<ReadIcon />);
        } else {
          setVerbLabel(translate("widgets.content_actions.watch") as Verb);
          setVerb("Watch");
          setIcon(<WatchIcon />);
        }
      } else if (content.processing === PROCESSING.NONE) {
        const theImport = platformHelper.getByIds({ collection: "imports", ids: [content.theImport.toString()] })[0];
        if (theImport && theImport.processing === PROCESSING.FINISHED) {
          setVerbLabel(translate("widgets.content_actions.enrich") as Verb);
          setVerb("Enrich");
          setIcon(<EnrichIcon />);
        }
      } else if (
        content.processing === PROCESSING.ERROR ||
        (content.processing === PROCESSING.REQUESTED && (content.updatedAt || 0) < dayjs().add(-10, "minutes").unix())
      ) {
        setVerbLabel(translate("widgets.content_actions.resubmit") as Verb);
        setVerb("Enrich");
        setIcon(<EnrichIcon />);
      }
    })();
  }, [content.processing]);
  return verb ? (
    <Button
      children={Icon}
      label={verbLabel}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (action(content, verb, navigate)) {
          setVerb("");
          setIcon(<></>);
        }
      }}
    />
  ) : (
    <></>
  );
}
