import Editor from "@monaco-editor/react";
import { Box, Button, Card, CardContent, CardHeader, Divider } from "@mui/material";
import { useRef, useState } from "react";
import { TopToolbar } from "react-admin";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import HelpButton from "../components/HelpButton";
import type { DataManager } from "../data/types";
import { SQLiteResults } from "../workers/sqlite/tag";
import SqlResults from "./SqlResults";

type Props = {
  proxy: DataManager;
};

export default function SqlPen({ proxy }: Props) {
  const editorRef = useRef<any>(null);
  const [editorValue, setEditorValue] = useState(localStorage.getItem("monacosql") || "");
  const [outputRows, setOutputRows] = useState<SQLiteResults[]>();
  const [executionTime, setExecutionTime] = useState<number>();
  const [error, setError] = useState("");

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
  }

  function handleEditorChange() {
    const value = editorRef.current.getValue();
    setEditorValue(value);
    localStorage.setItem("monacosql", value);
  }

  async function execute() {
    setError("");
    const selection = editorRef.current.getSelection();
    const queries = selection.isEmpty()
      ? editorRef.current?.getValue()
      : editorRef.current?.getModel().getValueInRange(selection);

    const start = Date.now();
    try {
      console.debug("Sending sql to worker");
      const out = await proxy.executeSql(queries);
      console.debug("Query back from worker");
      setOutputRows(out);
    } catch (e: any) {
      setError(e.message);
      console.error(e);
    }
    const end = Date.now();
    setExecutionTime(end - start);
  }
  const helpUrl = "/FIXME:";
  return (
    <div>
      <TopToolbar sx={{ justifyContent: "flex-end", alignItems: "center" }}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <CardHeader title={"SQL"} />
      <Card
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CardContent>
          <ResizableBox width={1200} height={300} minConstraints={[300, 200]}>
            <Editor
              options={{ minimap: { enabled: true }, automaticLayout: true }}
              defaultLanguage="sql"
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              defaultValue={editorValue}
            />
          </ResizableBox>
          <Box
            sx={{
              display: "flex",
              justifyContent: "left",
              alignItems: "center",
            }}
          >
            <Box>
              <Button variant="contained" sx={{ margin: "1em", width: 200 }} color={"primary"} onClick={execute}>
                {/* {translate("screens.sql.execute")} */}
                Execute
              </Button>
            </Box>
            {error ? (
              <Box sx={{ color: "red", fontSize: "2em" }}>{error}</Box>
            ) : (
              <Box>
                <Box>{typeof executionTime !== "undefined" ? `Execution time: ${executionTime}ms` : ""}</Box>
                <Box>
                  {typeof outputRows !== "undefined"
                    ? `Row count: ${outputRows?.[0]?.rows ? outputRows[0].rows.length : ""}`
                    : ""}
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {!error && outputRows && outputRows.length > 0 ? (
            outputRows
              .map<React.ReactNode>((output, i) => <SqlResults key={i} results={output} />)
              .reduce((accu, elem, i) =>
                accu === null ? [elem] : [accu, <Divider sx={{ borderBottomWidth: 5 }} />, elem],
              )
          ) : (
            <></>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
