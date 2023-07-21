import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, Grid, Typography } from "@mui/material";
import { ContentState, Editor, EditorState, convertFromHTML, convertFromRaw } from "draft-js";
import "draft-js/dist/Draft.css";
import { ReactElement, useState } from "react";
import { useTranslate } from "react-admin";
import { renderToString } from "react-dom/server";
import { CardType, DefinitionType, ProviderTranslationType, noop } from "../lib/types";
import MeaningEditor from "./MeaningEditor";
import PosItems from "./PosItems";

interface EditableDefinitionTranslationsProps {
  definition: DefinitionType;
  card: CardType;
  defaultProvider: string;
  onUpdate: (cardId: string, frontString: string) => void;
  onClose: () => void;
}

export default function EditableDefinitionTranslations({
  definition,
  defaultProvider,
  card,
  onUpdate,
  onClose,
}: EditableDefinitionTranslationsProps): ReactElement {
  const [current, setCurrent] = useState(card.front ? convertFromRaw(JSON.parse(card.front)) : undefined);
  const [editing, setEditing] = useState(false);
  const translate = useTranslate();

  function frontFromTranslations(providerTranslation: ProviderTranslationType): string {
    return renderToString(<PosItems providerEntry={providerTranslation} translate={translate} />);
  }

  function handleEditFromDefinition(providerTranslation: ProviderTranslationType): void {
    const contentHTML = convertFromHTML(frontFromTranslations(providerTranslation));
    const state = ContentState.createFromBlockArray(contentHTML.contentBlocks, contentHTML.entityMap);
    setCurrent(state);
    setEditing(true);
  }

  function handleSave(newFrontString: string) {
    onUpdate(card.id, newFrontString);
    setCurrent(convertFromRaw(JSON.parse(newFrontString)));
    setEditing(false);
  }

  return (
    <>
      {current && !editing && (
        <Grid sx={{ padding: "1em" }} container justifyContent="space-between">
          <Grid item>
            <Typography>{translate("widgets.editable_definition_translations.current_value")}</Typography>
            <Box sx={{ maxWidth: "500px" }}>
              <Editor editorState={EditorState.createWithContent(current)} onChange={noop} readOnly={true} />
            </Box>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={(event: React.MouseEvent<HTMLElement>) => {
                event.stopPropagation();
                setEditing(true);
              }}
            >
              Edit
            </Button>
          </Grid>
        </Grid>
      )}
      {current && editing && (
        <Grid sx={{ padding: "1em" }} container justifyContent="space-between">
          <Grid item>
            <Box sx={{ maxWidth: "500px" }}>
              <MeaningEditor initial={current} handleSave={handleSave} />
            </Box>
          </Grid>
        </Grid>
      )}
      {definition.providerTranslations.length &&
        definition.providerTranslations.map((providerEntry) => {
          return (
            providerEntry.posTranslations.length > 0 && (
              <Grid sx={{ padding: "1em" }} container justifyContent="space-between" key={providerEntry.provider}>
                <Grid item>
                  <Typography>{providerEntry.provider}</Typography>
                  <PosItems providerEntry={providerEntry} translate={translate} />
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    onClick={(event: React.MouseEvent<HTMLElement>) => {
                      event.stopPropagation();
                      handleEditFromDefinition(providerEntry);
                    }}
                  >
                    {translate(
                      `widgets.editable_definition_translations.${
                        providerEntry.provider === defaultProvider && !current && !editing ? "edit" : "use_me"
                      }`,
                    )}
                  </Button>
                </Grid>
              </Grid>
            )
          );
        })}
      <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "flex-end", alignContent: "flex-end" }}>
        <Button sx={{ ml: "auto", padding: "0.5em" }} size="small" onClick={onClose} startIcon={<CloseIcon />}>
          {translate("ra.action.close")}
        </Button>
      </Box>
    </>
  );
}
