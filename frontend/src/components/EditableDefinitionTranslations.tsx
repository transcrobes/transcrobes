import { ReactElement, useState } from "react";
import { CardType, DefinitionType, ProviderTranslationType } from "../lib/types";
import { Button, Grid, makeStyles, Typography } from "@material-ui/core";
import MeaningEditor from "./MeaningEditor";
import PosItems from "./PosItems";
import { renderToString } from "react-dom/server";
import { convertFromRaw, EditorState, ContentState, Editor, convertFromHTML } from "draft-js";
import "draft-js/dist/Draft.css";

const useStyles = makeStyles({
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
  const [current, setCurrent] = useState(
    card.front ? convertFromRaw(JSON.parse(card.front)) : undefined,
  );
  const [editing, setEditing] = useState(false);

  const styles = useStyles();

  function frontFromTranslations(providerTranslation: ProviderTranslationType): string {
    return renderToString(<PosItems providerEntry={providerTranslation} />);
  }

  function handleEditFromDefinition(providerTranslation: ProviderTranslationType): void {
    const contentHTML = convertFromHTML(frontFromTranslations(providerTranslation));
    const state = ContentState.createFromBlockArray(
      contentHTML.contentBlocks,
      contentHTML.entityMap,
    );

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

  function handleEditorChange(editorState: EditorState) {
    console.log(`editorState requires a method`, editorState);
  }

  return (
    <>
      {current && !editing && (
        <Grid className={styles.providerEntry} container justifyContent="space-between">
          <Grid item>
            <Typography>Current value</Typography>
            <div className={styles.editorContent}>
              <Editor
                editorState={EditorState.createWithContent(current)}
                onChange={handleEditorChange}
                readOnly={true}
              />
            </div>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </Grid>
        </Grid>
      )}
      {current && editing && (
        <Grid className={styles.providerEntry} container justifyContent="space-between">
          <Grid item>
            <div className={styles.editorContent}>
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
                className={styles.providerEntry}
                container
                justifyContent="space-between"
                key={providerEntry.provider}
              >
                <Grid item>
                  <Typography>{providerEntry.provider}</Typography>
                  <PosItems providerEntry={providerEntry} classes={styles} />
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    onClick={() => handleEditFromDefinition(providerEntry)}
                  >
                    {providerEntry.provider === defaultProvider && !current && !editing
                      ? "Edit"
                      : "Use Me Instead"}
                  </Button>
                </Grid>
              </Grid>
            )
          );
        })}
    </>
  );
}