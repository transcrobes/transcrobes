import { ReactElement, useEffect, useState } from "react";
import { useRecordContext, useTranslate } from "react-admin";
import { UserList } from "../lib/types";

const DATA_SOURCE = "UserListDetails.tsx";
export default function UserListDetails(): ReactElement {
  const userList = useRecordContext<UserList>();
  const [wordIds, setWordIds] = useState([] as string[]);
  const translate = useTranslate();
  useEffect(() => {
    (async function () {
      setWordIds(
        await window.componentsConfig.proxy.sendMessagePromise<string[]>({
          source: DATA_SOURCE,
          type: "getWordListWordIds",
          value: userList.id,
        }),
      );
    })();
  }, []);

  return (
    <table>
      <tr>
        <td>{translate("resources.userlists.nb_unique_words_in_list")}</td>
        <td>{wordIds.length}</td>
      </tr>
    </table>
  );
}
