// Copyright 2022 Roy T. Hashimoto. All Rights Reserved.
import * as VFS from "./sqlite-constants.js";
import asyncPool from "tiny-async-pool";
export * from "./sqlite-constants.js";

export async function asyncPoolAll(
  poolLimit: number,
  array: string[],
  iteratorFn: (generator: string) => Promise<string>,
) {
  const results: any[] = [];
  for await (const result of asyncPool(poolLimit, array, iteratorFn)) {
    results.push(result);
  }
  return results;
}

// Base class for a VFS.
export class Base {
  mxPathName = 64;

  xClose(fileId: number): number {
    return VFS.SQLITE_IOERR;
  }
  xRead(fileId: number, pData: Uint8Array, iOffset: number): number {
    return VFS.SQLITE_IOERR;
  }
  xWrite(fileId: number, pData: Uint8Array, iOffset: number): number {
    return VFS.SQLITE_IOERR;
  }
  xTruncate(fileId: number, iSize: number): number {
    return VFS.SQLITE_IOERR;
  }
  xSync(fileId: number, flags: any): number {
    return VFS.SQLITE_OK;
  }
  xFileSize(fileId: number, pSize64: DataView): number {
    return VFS.SQLITE_IOERR;
  }
  xLock(fileId: number, flags: number): number {
    return VFS.SQLITE_OK;
  }
  xUnlock(fileId: number, flags: number): number {
    return VFS.SQLITE_OK;
  }
  xCheckReservedLock(fileId: number, pResOut: DataView): number {
    pResOut.setInt32(0, 0, true);
    return VFS.SQLITE_OK;
  }
  xFileControl(fileId: number, op: number, pArg: DataView): number {
    return VFS.SQLITE_NOTFOUND;
  }
  xSectorSize(fileId: number): number {
    return 512;
  }
  xDeviceCharacteristics(fileId: number): number {
    return 0;
  }
  xOpen(name: string | null, fileId: number, flags: number, pOutFlags: DataView): number {
    return VFS.SQLITE_CANTOPEN;
  }
  xDelete(name: string, syncDir: number): number {
    return VFS.SQLITE_IOERR;
  }
  xAccess(name: string, flags: number, pResOut: DataView): number {
    return VFS.SQLITE_IOERR;
  }
  handleAsync(f: () => Promise<number>): number {
    // This default implementation deliberately does not match the
    // declared signature. It will be used in testing VFS classes
    // separately from SQLite. This will work acceptably for methods
    // that simply return the handleAsync() result without using it.
    // @ts-ignore
    return f();
  }
}

export const FILE_TYPE_MASK = [
  VFS.SQLITE_OPEN_MAIN_DB,
  VFS.SQLITE_OPEN_MAIN_JOURNAL,
  VFS.SQLITE_OPEN_TEMP_DB,
  VFS.SQLITE_OPEN_TEMP_JOURNAL,
  VFS.SQLITE_OPEN_TRANSIENT_DB,
  VFS.SQLITE_OPEN_SUBJOURNAL,
  VFS.SQLITE_OPEN_SUPER_JOURNAL,
].reduce((mask, element) => mask | element);
