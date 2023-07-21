import { useEffect, useState } from "react";
import { useRecordContext, useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { CalculatedContentValueStats } from "../lib/types";
import ContentValue from "./ContentValue";
import { platformHelper } from "../app/createStore";

const DATA_SOURCE = "ContentValueField";

export default function ContentStatsField({
  label,
  userlistId,
}: {
  label?: string;
  userlistId?: string;
  importId?: string;
}) {
  const record = useRecordContext();
  const translate = useTranslate();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  let limportId = "";
  if (Object.hasOwn(record, "theImport")) {
    limportId = record.theImport;
  }
  const [stats, setStats] = useState<CalculatedContentValueStats | null>();

  useEffect(() => {
    if (userlistId) {
      (async function () {
        if (!limportId) return;

        // @ts-ignore FIXME:
        const locStats: CalculatedContentValueStats | null = await platformHelper.getImportUtilityStatsForList({
          importId: limportId,
          userlistId,
          fromLang,
        });

        setStats(locStats);
      })();
    }
  }, [userlistId]);

  return stats ? (
    <ContentValue
      fromLang={fromLang}
      knownFoundWordsTotalTokens={stats?.knownFoundWordsTotalTokens || 0}
      knownFoundWordsTotalTypes={stats?.knownFoundWordsTotalTypes || 0}
      knownNotFoundWordsTotalTokens={stats?.knownNotFoundWordsTotalTokens || 0}
      knownNotFoundWordsTotalTypes={stats?.knownNotFoundWordsTotalTypes || 0}
      unknownFoundWordsTotalTypes={stats?.unknownFoundWordsTotalTypes || 0}
      unknownFoundWordsTotalTokens={stats?.unknownFoundWordsTotalTokens || 0}
      unknownNotFoundWordsTotalTokens={stats?.unknownNotFoundWordsTotalTokens || 0}
      unknownNotFoundWordsTotalTypes={stats?.unknownNotFoundWordsTotalTypes || 0}
    />
  ) : (
    <>{translate("resources.contents.loading")}</>
  );
}
