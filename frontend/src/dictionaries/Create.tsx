import { Create, required, SimpleForm, TextInput, useNotify, useRedirect, useRefresh } from "react-admin";
import { platformHelper, store } from "../app/createStore";
import { useAppSelector } from "../app/hooks";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { refreshDictionaries } from "../lib/dictionary";
import { DOCS_DOMAIN, UserDictionary } from "../lib/types";

export default function ACreate() {
  const notify = useNotify();
  const refresh = useRefresh();
  const redirect = useRedirect();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);

  function onSuccess({ data }: { data: UserDictionary }) {
    // TODO: Find out why this doesn't work...
    notify("resources.userdictionaries.changes_saved", { type: "success", messageArgs: { title: data.title } });
    redirect("/userdictionaries");
    refresh();
    refreshDictionaries(store, platformHelper, fromLang);
  }
  return (
    <Create
      mutationOptions={{ onSuccess: onSuccess }}
      actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/userdictionaries/`} />}
      redirect="list"
    >
      <SimpleForm>
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
      </SimpleForm>
    </Create>
  );
}
