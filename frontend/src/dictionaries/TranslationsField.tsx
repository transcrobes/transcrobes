import { ReactElement } from "react";
import { useRecordContext } from "react-admin";
import { PosTranslationsType } from "../lib/types";

interface Props {
  source: string;
  itemSeparator: string;
  className?: string;
}

export default function TranslationsField({ source, itemSeparator, className }: Props): ReactElement {
  const record = useRecordContext();
  const translations = record[source] as PosTranslationsType[];
  return (
    <>
      {translations &&
        translations.map((v) => {
          return (
            <div key={v.posTag + v.sounds} className={className}>
              {v.values.join(itemSeparator)
                ? `${v.posTag}: ` +
                  (translations.length > 1 ? `${v.sounds} :` : "") +
                  ` ${v.values.join(itemSeparator)}`
                : "???"}
            </div>
          );
        })}
    </>
  );
}
