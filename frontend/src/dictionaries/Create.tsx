import { Create, required, SimpleForm, TextInput, useNotify, useRedirect, useRefresh } from "react-admin";
import { store } from "../app/createStore";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { refreshDictionaries } from "../lib/dictionary";
import { DOCS_DOMAIN, UserDictionary } from "../lib/types";

export default function ACreate() {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();

  function onSuccess({ data }: { data: UserDictionary }) {
    notify(`Changes to dictionary "${data.title}" saved`);
    redirect("/userdictionaries");
    refresh();
    refreshDictionaries(store, window.componentsConfig.proxy);
  }
  return (
    <Create
      mutationOptions={{ onSuccess: onSuccess }}
      actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/userdictionaries/`} />}
    >
      <SimpleForm redirect="list">
        <TextInput label="Dictionary name" source="title" validate={[required()]} />
        <TextInput label="Dictionary description" multiline source="description" />
      </SimpleForm>
    </Create>
  );
}
