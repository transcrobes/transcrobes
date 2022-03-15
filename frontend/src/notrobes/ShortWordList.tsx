import { useEffect, useState } from "react";
import {
  Datagrid,
  Record as RARecord,
  FunctionField,
  ListContextProvider,
  TextField as RATextField,
  useList,
  Identifier,
} from "react-admin";
import { ShortWord } from "../lib/types";
import Pagination from "./Pagination";

interface Props {
  sourceGraph: string;
  data: ShortWord[];
  label: string;
  onRowClick: (id: Identifier, basePath: string, record: RARecord) => string;
}

export default function ShortWordList(props: Props) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [sort, setSort] = useState({ field: "id", order: "ASC" });
  const [data, setData] = useState<ShortWord[]>([]);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const newData = props.data.filter((x) => x.id !== props.sourceGraph).slice((page - 1) * perPage, page * perPage);
    setData(newData);
    setIds(newData.map((v) => v.id));
  }, [page, perPage, props.data]);

  const listContext = useList({
    data,
    ids,
    loaded: true,
    loading: false,
  });
  return (
    <div>
      <div>{props.label}</div>
      <ListContextProvider
        value={{ ...listContext, setPage, setPerPage, total: props.data.length - 1, page, perPage, sort, setSort }}
      >
        <Pagination forceSmall />
        <Datagrid rowClick={props.onRowClick}>
          <RATextField source="id" />
          <FunctionField label="Sounds" render={(record?: RARecord) => record && record.sounds?.join(" ")} />
        </Datagrid>
      </ListContextProvider>
    </div>
  );
}
