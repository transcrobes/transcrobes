import { Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import _ from "lodash";
import { useEffect, useState } from "react";
import { SQLiteResults } from "../workers/sqlite/tag";
import { sqlResultsToObjects } from "../workers/common-db";

export default function SqlResults({ results }: { results: SQLiteResults }) {
  const [dtRows, setDtRows] = useState<any[]>([]);
  const [dtCols, setDtCols] = useState<GridColDef[]>([]);

  useEffect(() => {
    setDtRows([]);
    setDtCols([]);

    const cols: GridColDef[] = [];
    let hasId = false;
    for (const key of results.columns) {
      const cc = _.camelCase(key);
      cols.push({ field: cc, headerName: key, width: 200 });
    }
    setDtCols(cols);
    const rws = sqlResultsToObjects(results) || [];

    console.log("rows", rws);
    if (!hasId) {
      for (let i = 0; i < rws.length; i++) {
        rws[i].auniqueid = i + 1;
      }
    }
    setDtRows(rws);
  }, [results]);
  return (
    <Box sx={{ m: 1 }}>
      <div>Results</div>
      <DataGrid
        getRowId={(row) => row.auniqueid}
        rows={dtRows}
        columns={dtCols}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        pageSizeOptions={[5, 10, 20, 50]}
      />
    </Box>
  );
}
