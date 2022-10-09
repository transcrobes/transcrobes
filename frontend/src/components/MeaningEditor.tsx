import { ContentState, convertToRaw } from "draft-js";
import MUIRichTextEditor from "./mui-rte/MUIRichTextEditor";
import { ReactElement } from "react";

interface MeaningEditorProps {
  initial: ContentState;
  handleSave: (updated: string) => void;
}

export default function MeaningEditor({ initial, handleSave }: MeaningEditorProps): ReactElement {
  const content = JSON.stringify(convertToRaw(initial));
  return <MUIRichTextEditor label="Type something here..." onSave={handleSave} defaultValue={content} />;
}
