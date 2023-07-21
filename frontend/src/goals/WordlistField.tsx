import { Box } from "@mui/system";
import { useEffect, useState } from "react";
import { useRecordContext } from "react-admin";
import { platformHelper } from "../app/createStore";
import { WordlistType } from "../lib/types";

export function WordlistField({ label }: { label?: string }) {
  const record = useRecordContext();
  const [wordlist, setWordlist] = useState<WordlistType | null>(null);
  let listId = "";
  if (Object.hasOwn(record, "userList")) {
    listId = record.userList;
  } else {
    listId = record.id.toString();
  }
  useEffect(() => {
    (async function () {
      if (!listId) return;
      const toto = await platformHelper.getWordlist(listId);
      setWordlist(toto);
    })();
  }, []);

  return <Box>{wordlist?.name}</Box>;
}
