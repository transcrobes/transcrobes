import { Create, FieldProps, required, SimpleForm, TextInput, useNotify, useRedirect, useRefresh } from "react-admin";
import { store } from "../app/createStore";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { refreshDictionaries } from "../lib/dictionary";
import { UserDictionary } from "../lib/types";

export default function ACreate(props: FieldProps<UserDictionary>) {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();

  function onSuccess({ data }: { data: UserDictionary }) {
    notify(`Changes to dictionary "${data.title}" saved`);
    redirect("/userdictionaries");
    refresh(true);
    refreshDictionaries(store, window.componentsConfig.proxy);
  }
  return (
    <Create
      onSuccess={onSuccess}
      actions={<HelpCreateActions helpUrl="https://transcrob.es/page/software/configure/userdictionaries/" />}
      {...props}
    >
      <SimpleForm redirect="list">
        <TextInput label="Dictionary name" source="title" validate={[required()]} />
        <TextInput label="Dictionary description" multiline source="description" />
      </SimpleForm>
    </Create>
  );
}

// export default ACreate;
