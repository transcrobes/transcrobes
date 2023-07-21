import SaveIcon from "@mui/icons-material/Save";
import { Button, Checkbox, FormControlLabel, FormGroup, TextField, Typography, useTheme } from "@mui/material";
import Papa from "papaparse";
import convertPinyinTones from "pinyin-tone-converter";
import React, { ReactElement, useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { Loading } from "../components/Loading";
import {
  AnyPosType,
  USER_DEFINITION_SOUND_SEPARATOR,
  UserDefinitionType,
  isEnTreebankPOS,
  isSimplePOS,
  isZhTreebankPOS,
} from "../lib/types";
import CustomList from "./CustomList";
import { DataManager } from "../data/types";

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
  proxy: DataManager;
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
  const translate = useTranslate();

  async function loadDictionary(event: React.ChangeEvent<HTMLInputElement>) {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      setFile(files[0]);
    }
  }

  async function saveDictionary() {
    setSaving(true);
    setLoading(true);
    setLoadingMessage(translate("resources.userdictionaries.saving_dictionary"));
    if (!data) return;
    await proxy.saveDictionaryEntries({ dictionaryId, entries: data });
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
    setLoadingMessage(translate("resources.userdictionaries.loading_entries"));
    (async function () {
      const existing = await proxy.getDictionaryEntries({ dictionaryId });
      setExistingData(existing);
      setFilteredExisting(existing);
      setByChar(graphRecordsToCharRecords(existing));
      setLoadingMessage("");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (columnSeparator) {
      setLoading(true);
      setLoadingMessage(translate("resources.userdictionaries.loading_existing"));
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
            if (
              columns.length >= 4 &&
              meanings.join("").trim() &&
              (isSimplePOS(pos) || isZhTreebankPOS(pos) || isEnTreebankPOS(pos))
            ) {
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
                  posTag: pos as AnyPosType,
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
                translations: [{ posTag: pos as AnyPosType, values: meanings }],
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
      <Typography variant="h6">{translate("resources.userdictionaries.import")}</Typography>
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
                {translate("general.upload")}
              </Button>
            </label>
          </span>
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em", width: "140px" }}
            required
            variant="outlined"
            label={translate("resources.userdictionaries.column_separator")}
            defaultValue={columnSeparator}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setColumnSeparator(event.target.value)}
          />
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em" }}
            variant="outlined"
            label={translate("resources.userdictionaries.meaning_sound_separator")}
            defaultValue={itemSeparator}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setItemSeparator(event.target.value)}
          />
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em", width: "150px" }}
            variant="outlined"
            label={translate("resources.userdictionaries.quote_character")}
            defaultValue={quoteChar}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuoteChar(event.target.value)}
          />
          <TextField
            disabled={saving || loading}
            style={{ margin: "1em", width: "160px" }}
            variant="outlined"
            label={translate("resources.userdictionaries.escape_character")}
            defaultValue={escapeChar}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEscapeChar(event.target.value)}
          />
          <FormControlLabel
            control={<Checkbox checked={headerRow} onChange={(_e, value) => setHeaderRow(value)} name="headerRow" />}
            label={translate("resources.userdictionaries.contains_header_row")}
          />
        </FormGroup>
      </div>

      <Loading position="relative" top="0" message={loadingMessage} disableShrink show={loading} />

      {data && (
        <>
          <Typography variant="h6">{translate("resources.userdictionaries.import_preview")}</Typography>
          <Typography>{translate("resources.userdictionaries.import_valid_entries")}</Typography>
          <CustomList data={Object.values(data)} itemSeparator={itemSeparator} />
          {invalidData && Object.keys(invalidData).length > 0 && (
            <>
              <hr />
              <Typography className={classes.error}>
                {translate("resources.userdictionaries.invalid_entries")}
              </Typography>
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
              {translate("ra.actions.save")}
            </Button>
          </div>
        </>
      )}
      <hr />
      <>
        <Typography>{translate("resources.userdictionaries.filter")}</Typography>
        <TextField
          disabled={saving || loading}
          style={{ margin: "1em" }}
          required
          variant="outlined"
          label={translate("resources.userdictionaries.graph")}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => filterExisting(event.target.value)}
        />
      </>

      {filteredExisting && (
        <div>
          <Typography>{translate("resources.userdictionaries.existing_entries")}</Typography>
          <CustomList data={Object.values(filteredExisting)} itemSeparator={itemSeparator} />
        </div>
      )}
    </>
  );
}
