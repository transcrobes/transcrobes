import { FC } from "react";
import { FieldProps, Show, SimpleShowLayout, TextField } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { UserDictionary } from "../lib/types";
import Import from "./Import";

const AShow: FC<FieldProps<UserDictionary>> = (props) => (
  <Show
    actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/userdictionaries/" />}
    {...props}
  >
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="description" />
      <Import dictionaryId={(props as any).id} proxy={window.componentsConfig.proxy} />
    </SimpleShowLayout>
  </Show>
);

export default AShow;
