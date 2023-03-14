import dayjs from "dayjs";
import { FunctionField } from "react-admin";

export default function UnixFieldAsDate({ source }: { source: string }) {
  return <FunctionField source={source} render={(record: any) => dayjs.unix(record[source]).toString()} />;
}
