import dayjs from "dayjs";
import {
  CreateParams,
  DataProvider,
  DeleteManyParams,
  DeleteParams,
  GetListParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  UpdateManyParams,
  UpdateParams,
} from "ra-core";
import { v4 as uuidv4 } from "uuid";
import { TranscrobesDatabase } from "../workers/rxdb/Schema";
import { getImportFileStorage } from "../workers/common-db";

export interface RxDBDataProviderParams {
  db: TranscrobesDatabase;
}

export function regexfilterQuery(field: string, searchText: string) {
  return { [field]: { $regex: `.*${searchText}.*` } };
}
export default function RxDBProvider(params: RxDBDataProviderParams): DataProvider {
  const db = params.db;
  db.internalStore;

  return {
    getList: async (resource: string, params: GetListParams) => {
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
        if (!(sortField in finder["selector"])) {
          finder["selector"][sortField] = { $exists: true }; // a sort field MUST be in the selector
        }
        finder["sort"] = [{ [sortField]: params.sort.order.toLowerCase() }];
      }
      if (params.pagination) {
        finder["limit"] = params.pagination.perPage;
        finder["skip"] = params.pagination.perPage * (params.pagination.page - 1);
      }

      const res = [...(await db[resource].find(finder).exec())];
      let resTot = res.length;
      if (!params.meta || !params.meta?.filteredAsAll) {
        resTot = [...(await db[resource].find().exec())].length;
      }
      const resArr = res.map((val) => val.toJSON());
      return { data: resArr, total: resTot };
    },
    getOne: async (resource: string, params: GetOneParams) => {
      // const db = await dbProm();
      // @ts-ignore TS2590: Expression produces a union type that is too complex to represent.
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
    getMany: async (resource: string, params: GetManyParams) => {
      const res = await db[resource].findByIds(params.ids.map((id) => id.toString())).exec();
      const resArr = [...res.values()].map((val) => val.toJSON());
      return { data: resArr };
    },
    getManyReference: async (resource: string, params: GetManyReferenceParams) => {
      // const res = await db[resource].find().where(params.target).eq(params.id).exec();
      const res = await db[resource]
        .find({
          selector: { [params.target]: { $eq: params.id.toString() } },
        })
        .exec();
      const resArr = [...res.values()].map((val) => val.toJSON());
      return { data: resArr, total: resArr.length };
    },
    create: async (resource: string, params: CreateParams) => {
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
            const importFileStore = await getImportFileStorage();
            const localFileName = `${insert.id}_${obj.title}`;
            importFileStore.put(localFileName, obj.rawFile);
            console.log("got a file", obj.rawFile, "with name", localFileName);
            insert[key] = localFileName;
          }
        }
      }
      // @ts-ignore TS2590: Expression produces a union type that is too complex to represent.
      const res = await db[resource].insert(insert);
      return { data: res.toJSON() };
    },
    update: async (resource: string, params: UpdateParams) => {
      // @ts-ignore
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
        const res = await one.incrementalPatch(params.data);
        return { data: res.toJSON() };
      } else {
        return { data: null };
      }
    },
    updateMany: async (resource: string, params: UpdateManyParams) => {
      const many = [...(await db[resource].findByIds(params.ids.map((id) => id.toString())).exec()).values()];
      const updates: string[] = [];
      for (const upper of many) {
        await upper.incrementalPatch(params.data);
        updates.push(upper.id.toString());
      }
      return { data: updates };
    },
    delete: async (resource: string, params: DeleteParams) => {
      const one = db[resource].findOne({ selector: { id: { $eq: params.id.toString() } } });
      const res = await one.remove();
      return { data: res?.toJSON() };
    },
    deleteMany: async (resource: string, params: DeleteManyParams) => {
      // const db = await dbProm();
      const { success } = await db[resource].bulkRemove(params.ids.map((id) => id.toString()));
      return { data: success.map((doc) => doc.id) };
    },
  };
}
