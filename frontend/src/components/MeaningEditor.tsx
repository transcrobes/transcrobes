import { ReactElement } from "react";
import { useTranslate } from "react-admin";

interface MeaningEditorProps {
  // initial: ContentState;
  initial: any;
  handleSave: (updated: string) => void;
}

export default function MeaningEditor({ initial, handleSave }: MeaningEditorProps): ReactElement {
  const translate = useTranslate();

  // const content = JSON.stringify(convertToRaw(initial));
  return (
    <></>
    // <MUIRichTextEditor
    //   label={translate("widgets.meaning_editor.type_something_here")}
    //   onSave={handleSave}
    //   defaultValue={content}
    // />
  );
}
