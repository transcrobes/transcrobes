import * as SQLite from "wa-sqlite";

export type SQLiteResults = {
  columns: string[];
  rows: SQLiteCompatibleType[][];
};

export type TagFunction = (sql: string, values?: SQLiteCompatibleType[][]) => Promise<SQLiteResults[]>;

/**
 * Build a query function for a database.
 *
 * The returned function can be invoke in two ways, (1) as a template
 * tag, or (2) as a regular function.
 *
 * When used as a template tag, multiple SQL statements are accepted and
 * string interpolants can be used, e.g.
 * ```
 *   const results = await tag`
 *     PRAGMA integrity_check;
 *     SELECT * FROM ${tblName};
 *   `;
 * ```
 *
 * When called as a regular function, only one statement can be used
 * and SQLite placeholder substitution is performed, e.g.
 * ```
 *   const results = await tag('INSERT INTO tblName VALUES (?, ?)', [
 *     ['foo', 1],
 *     ['bar', 17],
 *     ['baz', 42]
 *   ]);
 * ```
 */
export function createTag(sqlite3: SQLiteAPI, db: number): TagFunction {
  // Helper function to execute the query.
  async function execute(sql: string, bindings?: any[]) {
    const results: SQLiteResults[] = [];
    for await (const stmt of sqlite3.statements(db, sql)) {
      let columns: string[] | undefined;
      for (const binding of bindings ?? [[]]) {
        sqlite3.reset(stmt);
        if (bindings) {
          sqlite3.bind_collection(stmt, binding);
        }
        const rows: SQLiteCompatibleType[][] = [];
        while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
          const row = sqlite3.row(stmt);
          rows.push(row);
        }
        columns = columns ?? sqlite3.column_names(stmt);
        if (columns.length) {
          results.push({ columns, rows });
        }
      }

      // When binding parameters, only a single statement is executed.
      if (bindings) {
        return results;
      }
    }
    return results;
  }

  return async function (sql: string, values?: SQLiteCompatibleType[][]) {
    return execute(sql as string, values as any);
  };
}
