import { Container, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import DownloadIcon from "@mui/icons-material/GetApp";
import jsonexport from "jsonexport/dist";
import { Button, TopToolbar } from "ra-ui-materialui";
import { ReactElement, useState } from "react";
import { downloadCSV, useTranslate } from "react-admin";
import HelpButton from "../components/HelpButton";
import { Loading } from "../components/Loading";
import { ServiceWorkerProxy } from "../lib/proxies";
import { DayModelStatsType, DOCS_DOMAIN } from "../lib/types";

type Props = {
  proxy: ServiceWorkerProxy;
};

const DATA_SOURCE = "Exports.tsx";

const useStyles = makeStyles()((theme) => ({
  exportType: { margin: theme.spacing(1), justifyContent: "space-between", display: "inline-flex", width: "100%" },
  header: { margin: theme.spacing(1), alignContent: "center" },
  toolbar: { alignItems: "center", maxHeight: "64px" },
}));

function jsonexportPromise(wordStats: any): Promise<string> {
  return new Promise((resolve, reject) => {
    jsonexport(wordStats, (err: Error, csv: string) => {
      if (err) reject(err);
      resolve(csv);
    });
  });
}

export default function Exports({ proxy }: Props): ReactElement {
  const { classes } = useStyles();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/configure/exports/`;
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();

  async function runCardsExport() {
    setLoading(true);
    const stats = await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "getCardsForExport",
    });
    const csv = await jsonexportPromise(stats);
    downloadCSV(csv, "card_details");
    setLoading(false);
  }

  async function runDayExport() {
    setLoading(true);
    const stats = await proxy.sendMessagePromise<DayModelStatsType[]>({
      source: DATA_SOURCE,
      type: "getDayStats",
    });
    const csv = await jsonexportPromise(
      stats.map(({ id, updatedAt, ...stat }) => {
        return {
          date: `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`,
          ...stat,
        };
      }),
    );
    downloadCSV(csv, "day_stats");
    setLoading(false);
  }

  async function runWordExport() {
    setLoading(true);
    const wordStats = await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "getWordStatsForExport",
    });
    const csv = await jsonexportPromise(wordStats);
    downloadCSV(csv, "word_stats");
    setLoading(false);
  }

  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Container maxWidth="sm">
        <Typography className={classes.header} variant="h4">
          {translate("screens.exports.title")}
        </Typography>
        <hr />
        {loading && <Loading show />}
        <div className={classes.exportType}>
          <div>{translate("screens.exports.per_word_activity")}</div>

          <Button
            disabled={!proxy.loaded || loading}
            onClick={runWordExport}
            children={<DownloadIcon />}
            variant="text"
            label={translate("buttons.general.download")}
          />
        </div>
        <hr />
        <div className={classes.exportType}>
          <div>{translate("screens.exports.per_day_activity")}</div>
          <Button
            disabled={!proxy.loaded || loading}
            onClick={runDayExport}
            children={<DownloadIcon />}
            variant="text"
            label={translate("buttons.general.download")}
          />
        </div>
        <hr />
        <div className={classes.exportType}>
          <div>{translate("screens.exports.all_card_data")}</div>
          <Button
            disabled={!proxy.loaded || loading}
            onClick={runCardsExport}
            children={<DownloadIcon />}
            variant="text"
            label={translate("buttons.general.download")}
          />
        </div>
      </Container>
    </>
  );
}
