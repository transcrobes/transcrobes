import { useEffect, useState } from "react";
import {
  Datagrid,
  FunctionField,
  Identifier,
  ListContextProvider,
  TextField as RATextField,
  RaRecord,
  useList,
  useTranslate,
} from "react-admin";
import { ShortWord } from "../lib/types";
import Pagination from "./Pagination";

interface Props {
  sourceGraph: string;
  data: ShortWord[];
  label: string;
  onRowClick: (id: Identifier, basePath: string, record: RaRecord) => string;
}

export default function ShortWordList(props: Props) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [sort, setSort] = useState({ field: "id", order: "ASC" as "ASC" | "DESC" });
  const [data, setData] = useState<ShortWord[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const translate = useTranslate();

  useEffect(() => {
    const newData = props.data.filter((x) => x.id !== props.sourceGraph).slice((page - 1) * perPage, page * perPage);
    setData(newData);
    setIds(newData.map((v) => v.id));
  }, [page, perPage, props.data]);

  const listContext = useList({
    data,
    // ids,
    // loaded: true,
    // loading: false,
  });
  return (
    <div>
      <div>{props.label}</div>
      <ListContextProvider
        value={{ ...listContext, setPage, setPerPage, total: props.data.length - 1, page, perPage, sort, setSort }}
      >
        <Pagination forceSmall />
        <Datagrid bulkActionButtons={false} rowClick={props.onRowClick}>
          <RATextField source="id" label={translate("screens.notrobes.short_word_list.id")} />
          <FunctionField
            label={translate("screens.notrobes.short_word_list.sounds")}
            render={(record) => record?.sounds?.join(" ")}
          />
        </Datagrid>
      </ListContextProvider>
    </div>
  );
}
