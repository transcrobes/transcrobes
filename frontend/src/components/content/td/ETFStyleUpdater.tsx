import { useEffect } from "react";
import { useAppSelector } from "../../../app/hooks";
import { DEFAULT_BOOK_READER_CONFIG_STATE } from "../../../lib/types";

type Props = {
  sheet: any;
  id: string;
};

export default function ETFStyleUpdater({ sheet, id }: Props) {
  const readerConfig = useAppSelector((state) => state.bookReader[id] || DEFAULT_BOOK_READER_CONFIG_STATE);

  useEffect(() => {
    sheet.update(readerConfig);
  }, [readerConfig]);

  return <></>;
}
