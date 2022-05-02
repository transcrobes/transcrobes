import { Button, Checkbox, FormControlLabel, FormGroup, TextField, Typography, useTheme } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import SaveIcon from "@mui/icons-material/Save";
import convertPinyinTones from "pinyin-tone-converter";
import React, { ReactElement, useEffect, useState } from "react";
import { Loading } from "../components/Loading";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  isSimplePOS,
  isTreebankPOS,
  SimplePosType,
  TreebankPosType,
  UserDefinitionType,
  USER_DEFINITION_SOUND_SEPARATOR,
} from "../lib/types";
import CustomList from "./CustomList";
import Papa from "papaparse";

const useStyles = makeStyles()((theme) => ({
  error: {
    color: theme.palette.error.main,
  },
  importBox: {
    textAlign: "center",
    padding: "1em",
  },
  previewBox: {
    display: "flex",
  },
  previewTable: {
    borderSpacing: "5px",
  },
}));

const DATA_SOURCE = "dictionaries/Import.tsx";

interface Props {
  dictionaryId: string;
  proxy: ServiceWorkerProxy;
}

function graphRecordsToCharRecords(entries: Record<string, UserDefinitionType>) {
  const newByChar: Record<string, Set<UserDefinitionType>> = {};
  for (const entry of Object.values(entries)) {
    for (const char of entry.id.split("")) {
      if (char in newByChar) {
        newByChar[char].add(entry);
      } else {
        newByChar[char] = new Set([entry]);
      }
    }
  }
  return newByChar;
}

export default function Import({ dictionaryId, proxy }: Props): ReactElement {
  const [file, setFile] = useState<File>();
  const [columnSeparator, setColumnSeparator] = useState(",");
  const [quoteChar, setQuoteChar] = useState('"');
  const [escapeChar, setEscapeChar] = useState('"');
  const [itemSeparator, setItemSeparator] = useState("/");
  const [headerRow, setHeaderRow] = useState(false);
  const [data, setData] = useState<Record<string, UserDefinitionType>>();
  const [invalidData, setInvalidData] = useState<Record<string, UserDefinitionType>>();
  const [existingData, setExistingData] = useState<Record<string, UserDefinitionType>>();
  const [filteredExisting, setFilteredExisting] = useState<Record<string, UserDefinitionType>>();
  const [byChar, setByChar] = useState<Record<string, Set<UserDefinitionType>>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { classes } = useStyles();
  const theme = useTheme();

  async function loadDictionary(event: React.ChangeEvent<HTMLInputElement>) {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      setFile(files[0]);
    }
  }

  async function saveDictionary() {
    setSaving(true);
    setLoading(true);
    setLoadingMessage("Saving Dictionary");
    if (!data) return;
    await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "saveDictionaryEntries",
      value: { dictionaryId, entries: data },
    });
    const existing = { ...data };
    setExistingData(existing);
    setFilteredExisting(existing);
    setByChar(graphRecordsToCharRecords(existing));
    setSaving(false);
    setFile(undefined);
    setLoading(false);
  }

  function filterExisting(graph: string) {
    if (!graph && existingData) {
      setFilteredExisting({ ...existingData });
      return;
    }
    const newFiltered: Record<string, UserDefinitionType> = {};
    for (const char of graph.split("")) {
      if (byChar[char]) {
        for (const val of byChar[char]) {
          if (val.id.includes(graph)) {
            newFiltered[val.id] = val;
          }
        }
      }
    }
    setFilteredExisting(newFiltered);
  }

  useEffect(() => {
    setLoading(true);
    if (proxy.loaded) {
      setLoadingMessage("Loading existing entries");
      (async function () {
        const existing = await proxy.sendMessagePromise<Record<string, UserDefinitionType>>({
          source: DATA_SOURCE,
          type: "getDictionaryEntries",
          value: { dictionaryId: dictionaryId },
        });
        setExistingData(existing);
        setFilteredExisting(existing);
        setByChar(graphRecordsToCharRecords(existing));
        setLoadingMessage("");
        setLoading(false);
      })();
    }
  }, [proxy.loaded]);

  useEffect(() => {
    if (columnSeparator) {
      setLoading(true);
      setLoadingMessage("Loading dictionary");
      (async () => {
        const text = await file?.text();
        if (text) {
          const lines = Papa.parse(text, {
            delimiter: columnSeparator.replace("\\t", "\t"),
            header: false,
            skipEmptyLines: "greedy",
            escapeChar,
            quoteChar,
          });
          let itemsep: RegExp | string = itemSeparator;
          try {
            itemsep = new RegExp(itemSeparator, "g");
            // eslint-disable-next-line no-empty
          } catch {}

          const newData: Record<string, UserDefinitionType> = {};
          const newInvalidData: Record<string, UserDefinitionType> = {};
          for (const error of lines.errors) {
            newInvalidData[error.row.toString()] = {
              id: error.row.toString(),
              translations: [{ posTag: "OTHER", values: [error.message] }],
            };
          }
          for (const columns of lines.data.slice(headerRow ? 1 : 0) as string[][]) {
            const meanings = columns.slice(3).join("").split(itemsep);
            const pos = columns[1] || "OTHER";
            const sounds = itemSeparator
              ? convertPinyinTones(columns[2] || "")
              : convertPinyinTones(columns[2] || "")
                  .split(itemSeparator)
                  .join(USER_DEFINITION_SOUND_SEPARATOR);
            if (columns.length >= 4 && meanings.join("").trim() && (isSimplePOS(pos) || isTreebankPOS(pos))) {
              const graph = columns[0];
              if (!newData[graph]) {
                newData[graph] = {
                  id: graph,
                  sounds,
                  translations: [],
                };
              }

              const lexeme = newData[graph].translations?.find((x) => x.posTag === pos && x.sounds === sounds);
              if (!lexeme) {
                newData[graph].translations?.push({
                  posTag: pos as SimplePosType | TreebankPosType,
                  values: meanings,
                  sounds,
                });
              } else {
                lexeme.values.push(...meanings);
              }
            } else {
              newInvalidData[columns[0]] = {
                id: columns[0],
                sounds,
                translations: [{ posTag: pos as SimplePosType | TreebankPosType, values: meanings }],
              };
            }
          }
          setData(newData);
          setInvalidData(newInvalidData);
          setLoadingMessage("");
          setLoading(false);
        } else {
          setData(undefined);
          setLoadingMessage("");
          if (existingData) {
            setLoading(false);
          }
        }
      })();
    }
  }, [file, columnSeparator, itemSeparator, quoteChar, escapeChar, headerRow]);

  return (
    <>
      <Typography variant="h6">Dictionary import</Typography>
      <div className={classes.importBox}>
        <FormGroup row>
          <span>
            <input
              accept=".csv"
              onChange={loadDictionary}
              style={{ display: "none" }}
              id="raised-button-file"
              multiple
              type="file"
            />
            <label htmlFor="raised-button-file">
              <Button
                disabled={saving || loading}
                variant="outlined"
                component="span"
                size="large"
                style={{ margin: "1em" }}
              >
                Upload
              </Button>
            </label>
          </span>
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em", width: "140px" }}
            required
            variant="outlined"
            label="Column separator"
            defaultValue={columnSeparator}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setColumnSeparator(event.target.value)}
          />
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em" }}
            variant="outlined"
            label="Meaning/Sound separator"
            defaultValue={itemSeparator}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setItemSeparator(event.target.value)}
          />
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em", width: "150px" }}
            variant="outlined"
            label="Quote character"
            defaultValue={quoteChar}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuoteChar(event.target.value)}
          />
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em", width: "160px" }}
            variant="outlined"
            label="Escape character"
            defaultValue={escapeChar}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEscapeChar(event.target.value)}
          />
          <FormControlLabel
            control={<Checkbox checked={headerRow} onChange={(_e, value) => setHeaderRow(value)} name="headerRow" />}
            label="Contains header row"
          />
        </FormGroup>
      </div>

      <Loading position="relative" top="0" message={loadingMessage} disableShrink show={loading} />

      {data && (
        <>
          <Typography variant="h6">Import Preview</Typography>
          <Typography>Valid import entries</Typography>
          <CustomList data={Object.values(data)} itemSeparator={itemSeparator} />
          {invalidData && Object.keys(invalidData).length > 0 && (
            <>
              <hr />
              <Typography className={classes.error}>Invalid import entries (ignored)</Typography>
              <CustomList
                rowColour={theme.palette.error.main}
                data={Object.values(invalidData)}
                itemSeparator={itemSeparator}
              />
            </>
          )}
          <div style={{ textAlign: "right" }}>
            <Button
              onClick={saveDictionary}
              disabled={saving || loading}
              variant="contained"
              color="primary"
              size="large"
              style={{ margin: "1em" }}
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
          </div>
        </>
      )}
      {filteredExisting && (
        <div>
          <hr />
          {Object.keys(filteredExisting).length > 0 && (
            <>
              <Typography>Filter</Typography>
              <TextField
                disabled={saving || loading}
                style={{ margin: "1em" }}
                required
                variant="outlined"
                label="Graph"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => filterExisting(event.target.value)}
              />
            </>
          )}
          <Typography>Existing Entries</Typography>
          <CustomList data={Object.values(filteredExisting)} itemSeparator={itemSeparator} />
        </div>
      )}
    </>
  );
}
