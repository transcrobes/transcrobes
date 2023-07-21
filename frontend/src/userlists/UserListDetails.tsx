import { ReactElement, useEffect, useState } from "react";
import { useRecordContext, useTranslate } from "react-admin";
import { UserList } from "../lib/types";
import { platformHelper } from "../app/createStore";

export default function UserListDetails(): ReactElement {
  const userList = useRecordContext<UserList>();
  const [count, setCount] = useState(0);
  const translate = useTranslate();
  useEffect(() => {
    (async function () {
      setCount(await platformHelper.getWordListWordCount(userList.id.toString()));
    })();
  }, []);

  return (
    <table>
      <tr>
        <td>{translate("resources.userlists.nb_unique_words_in_list")}</td>
        <td>{count}</td>
      </tr>
    </table>
  );
}
