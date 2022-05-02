import { Button, Grid, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { ContentState, convertFromHTML, convertFromRaw, Editor, EditorState } from "draft-js";
import "draft-js/dist/Draft.css";
import { ReactElement, useState } from "react";
import { renderToString } from "react-dom/server";
import { CardType, DefinitionType, noop, ProviderTranslationType } from "../lib/types";
import MeaningEditor from "./MeaningEditor";
import PosItems from "./PosItems";

const useStyles = makeStyles()({
  providerEntry: { padding: "1em" },
  translations: { maxWidth: "500px" },
  editorContent: { maxWidth: "500px" },
});

interface EditableDefinitionTranslationsProps {
  definition: DefinitionType;
  card: CardType;
  defaultProvider: string;
  onUpdate: (card: CardType) => void;
}

export default function EditableDefinitionTranslations({
  definition,
  defaultProvider,
  card,
  onUpdate,
}: EditableDefinitionTranslationsProps): ReactElement {
  const [current, setCurrent] = useState(card.front ? convertFromRaw(JSON.parse(card.front)) : undefined);
  const [editing, setEditing] = useState(false);

  const { classes } = useStyles();

  function frontFromTranslations(providerTranslation: ProviderTranslationType): string {
    return renderToString(<PosItems providerEntry={providerTranslation} />);
  }

  function handleEditFromDefinition(providerTranslation: ProviderTranslationType): void {
    const contentHTML = convertFromHTML(frontFromTranslations(providerTranslation));
    const state = ContentState.createFromBlockArray(contentHTML.contentBlocks, contentHTML.entityMap);

    setCurrent(state);
    setEditing(true);
  }

  function handleSave(updated: string) {
    // FIXME: this is nasty, right? I should be using state somehow, no?
    card.front = updated;
    onUpdate(card);
    setCurrent(convertFromRaw(JSON.parse(updated)));
    setEditing(false);
  }

  return (
    <>
      {current && !editing && (
        <Grid className={classes.providerEntry} container justifyContent="space-between">
          <Grid item>
            <Typography>Current value</Typography>
            <div className={classes.editorContent}>
              <Editor editorState={EditorState.createWithContent(current)} onChange={noop} readOnly={true} />
            </div>
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
        <Grid className={classes.providerEntry} container justifyContent="space-between">
          <Grid item>
            <div className={classes.editorContent}>
              <MeaningEditor initial={current} handleSave={handleSave} />
            </div>
          </Grid>
        </Grid>
      )}
      {definition.providerTranslations.length &&
        definition.providerTranslations.map((providerEntry) => {
          return (
            providerEntry.posTranslations.length > 0 && (
              <Grid
                className={classes.providerEntry}
                container
                justifyContent="space-between"
                key={providerEntry.provider}
              >
                <Grid item>
                  <Typography>{providerEntry.provider}</Typography>
                  <PosItems providerEntry={providerEntry} classes={classes} />
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    onClick={(event: React.MouseEvent<HTMLElement>) => {
                      event.stopPropagation();
                      handleEditFromDefinition(providerEntry);
                    }}
                  >
                    {providerEntry.provider === defaultProvider && !current && !editing ? "Edit" : "Use Me Instead"}
                  </Button>
                </Grid>
              </Grid>
            )
          );
        })}
    </>
  );
}
