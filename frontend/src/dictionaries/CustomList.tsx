import { useEffect, useState } from "react";
import {
  Datagrid,
  FunctionField,
  ListContextProvider,
  Pagination,
  RaRecord,
  TextField as RATextField,
  useList,
  useTranslate,
} from "react-admin";
import { UserDefinitionType } from "../lib/types";
import TranslationsField from "./TranslationsField";

interface Props {
  data: UserDefinitionType[];
  itemSeparator: string;
  rowColour?: string;
}

export default function CustomList(props: Props) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sort, setSort] = useState({ field: "id", order: "ASC" });
  const [data, setData] = useState<UserDefinitionType[]>([]);
  const [, setIds] = useState<string[]>([]);
  const translate = useTranslate();

  useEffect(() => {
    const newData = props.data.slice((page - 1) * perPage, page * perPage);
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
    <ListContextProvider
      value={{ ...listContext, setPage, setPerPage, total: props.data.length, page, perPage, sort, setSort }}
    >
      <Pagination />
      <Datagrid
        rowStyle={() => {
          return { color: [props.rowColour, "!important"] || "inherit" };
        }}
      >
        <RATextField source="id" />
        <FunctionField
          label={translate("resources.userdictionaries.sounds")}
          render={(record?: RaRecord) => record && record.sounds}
        />
        <TranslationsField source="translations" itemSeparator={props.itemSeparator} />
      </Datagrid>
    </ListContextProvider>
  );
}
