import { CreateParams, DataProvider, GetListParams, GetManyParams, GetOneParams } from "ra-core";
import { DeleteManyParams, DeleteParams, GetManyReferenceParams, UpdateManyParams, UpdateParams } from "react-admin";
import { v4 as uuidv4 } from "uuid";

import { getDb } from "../database/Database";
import { getNamedFileStorage } from "../lib/data";
import { TranscrobesCollectionsKeys, TranscrobesDatabase } from "../database/Schema";
import dayjs from "dayjs";

type DbDataProvider = DataProvider & { db: () => Promise<TranscrobesDatabase> };

export default function RxDBProvider(params: RxDBDataProviderParams): DbDataProvider {
  const parameters = params;
  let dbPromise: Promise<TranscrobesDatabase>;
  function dbProm() {
    if (!dbPromise) {
      dbPromise = getDb(
        params,
        () => {
          return;
        },
        undefined,
        false,
      );
    }
    return dbPromise;
  }

  return {
    getList: async (resource: TranscrobesCollectionsKeys, params: GetListParams) => {
      // pagination: { page: 1, perPage: 5 }, sort: { field: 'title', order: 'ASC' }, filter: { author_id: 12 },
      const finder: any = {};

      if (params.filter) {
        finder["selector"] = {};
        for (let i = 0; i < Object.keys(params.filter).length; i++) {
          const filterField = Object.keys(params.filter)[i];
          if (filterField) {
            finder["selector"][filterField] = Object.values(params.filter)[i];
          }
        }
      }
      if (params.sort) {
        const sortField = params.sort.field;
        if (!finder["selector"]) finder["selector"] = {};

        finder["selector"][sortField] = { $exists: true }; // a sort field MUST be in the selector
        finder["sort"] = [{ [sortField]: params.sort.order.toLowerCase() }];
      }
      if (params.pagination) {
        finder["limit"] = params.pagination.perPage;
        finder["skip"] = params.pagination.perPage * (params.pagination.page - 1);
      }

      const db = await dbProm();
      const res = [...(await db[resource].find(finder).exec())];
      const resTot = [...(await db[resource].find().exec())];
      const resArr = res.map((val) => val.toJSON());

      return { data: resArr, total: resTot.length };
    },
    getOne: async (resource: TranscrobesCollectionsKeys, params: GetOneParams) => {
      const db = await dbProm();
      const res = await db[resource].findOne({ selector: { id: { $eq: params.id.toString() } } }).exec();
      const data = res?.toJSON();

      if (resource === "surveys") {
        const usres = await db.usersurveys
          .findOne({
            selector: { surveyId: { $eq: params.id.toString() } },
          })
          .exec();
        if (usres) {
          const specialData = { data: { ...data, data: usres.data } };
          return specialData;
        }
      }
      return { data: data };
    },
    getMany: async (resource: TranscrobesCollectionsKeys, params: GetManyParams) => {
      const db = await dbProm();
      const res = await db[resource].findByIds(params.ids.map((id) => id.toString()));
      const resArr = [...res.values()].map((val) => val.toJSON());
      return { data: resArr };
    },
    getManyReference: async (resource: TranscrobesCollectionsKeys, params: GetManyReferenceParams) => {
      const db = await dbProm();
      // const res = await db[resource].find().where(params.target).eq(params.id).exec();
      const res = await db[resource]
        .find({
          selector: { [params.target]: { $eq: params.id.toString() } },
        })
        .exec();
      const resArr = [...res.values()].map((val) => val.toJSON());
      return { data: resArr, total: resArr.length };
    },
    create: async (resource: TranscrobesCollectionsKeys, params: CreateParams) => {
      const db = await dbProm();
      const insert = params.data;
      if (!("id" in insert) || !insert.id) {
        insert.id = uuidv4();
      }
      // this is nasty - they get updated properly server side but we need one here for
      // the list views ordered by createdAt, or they don't appear
      if (
        ["imports", "contents", "goals", "userlists", "usersurveys"].includes(resource) &&
        (!("createdAt" in insert) || !insert.createdAt)
      ) {
        insert.createdAt = new Date().getTime() / 1000;
      }
      for (const key in insert) {
        const obj = insert[key];
        if (typeof obj === "object" && obj != null && "rawFile" in obj) {
          if (obj.rawFile instanceof File) {
            const importFileStore = await getNamedFileStorage(parameters);
            const localFileName = `${insert.id}_${obj.title}`;
            importFileStore.put(localFileName, obj.rawFile);
            insert[key] = localFileName;
          }
        }
      }
      const res = await db[resource].insert(insert);
      return { data: res.toJSON() };
    },
    update: async (resource: TranscrobesCollectionsKeys, params: UpdateParams) => {
      const db = await dbProm();
      const one = await db[resource].findOne({ selector: { id: { $eq: params.id.toString() } } }).exec();
      if (one) {
        delete params.data.id; // FIXME: there must be a less nasty way...
        // I guess this could be done on the server? Should it be?
        if ("status" in params.data && "status" in params.previousData) {
          if (!!params.data.status && !params.previousData.status) {
            params.data["activateDate"] = dayjs().valueOf() / 1000;
          } else if (!params.data.status && !!params.previousData.status) {
            params.data["deactivateDate"] = dayjs().valueOf() / 1000;
          }
        }
        const res = await one.atomicPatch(params.data);
        return { data: res.toJSON() };
      } else {
        return { data: null };
      }
    },
    updateMany: async (resource: TranscrobesCollectionsKeys, params: UpdateManyParams) => {
      const db = await dbProm();
      const many = [...(await db[resource].findByIds(params.ids.map((id) => id.toString()))).values()];
      const updates: string[] = [];
      for (const upper of many) {
        await upper.atomicPatch(params.data);
        updates.push(upper.id.toString());
      }
      return { data: updates };
    },
    delete: async (resource: TranscrobesCollectionsKeys, params: DeleteParams) => {
      const db = await dbProm();
      const one = db[resource].findOne({ selector: { id: { $eq: params.id.toString() } } });
      const res = await one.remove();
      return { data: res?.toJSON() };
    },
    deleteMany: async (resource: TranscrobesCollectionsKeys, params: DeleteManyParams) => {
      const db = await dbProm();
      const { success } = await db[resource].bulkRemove(params.ids.map((id) => id.toString()));
      return { data: success.map((doc) => doc.id) };
    },
    db: () => {
      return dbProm();
    },
  } as DbDataProvider;
}

export interface RxDBDataProviderParams {
  test?: boolean;
  url: URL;
  username: string;
  loggingEnabled?: boolean;
}
