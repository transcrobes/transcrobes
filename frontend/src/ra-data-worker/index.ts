import {
  CreateParams,
  DataProvider,
  DeleteManyParams,
  DeleteParams,
  GetListParams,
  GetManyParams,
  GetOneParams,
  UpdateManyParams,
  UpdateParams,
} from "ra-core";

const MESSAGE_TYPE = "RxDBProvider";

type AnyParams =
  | GetListParams
  | GetOneParams
  | GetManyParams
  | CreateParams
  | UpdateParams
  | UpdateManyParams
  | DeleteParams
  | DeleteManyParams;

export type RequestOptions = {
  method: keyof DataProvider;
  collection: string;
  params: AnyParams;
};

type WorkerDataProviderParams = {
  request: (message: any) => Promise<any>;
};

export default function WorkerDataProvider(params: WorkerDataProviderParams): DataProvider {
  const request = params.request;

  async function getData(options: RequestOptions) {
    const val = await request({
      type: MESSAGE_TYPE,
      source: "DataProvider",
      value: options,
    });

    if (val && val.data) {
      return val;
    } else {
      throw new Error("No data returned");
    }
  }
  return {
    getList: async (resource: string, params: GetListParams) => {
      return await getData({
        method: "getList",
        collection: resource,
        params: params,
      });
    },
    getOne: async (resource: string, params: GetOneParams) => {
      return await getData({
        method: "getOne",
        collection: resource,
        params: params,
      });
    },
    getMany: async (resource: string, params: GetManyParams) => {
      return await getData({
        method: "getMany",
        collection: resource,
        params: params,
      });
    },
    getManyReference: async (resource: string, params: any) => {
      return await getData({
        method: "getManyReference",
        collection: resource,
        params: params,
      });
    },
    create: async (resource: string, params: CreateParams) => {
      return await getData({
        method: "create",
        collection: resource,
        params: params,
      });
    },
    update: async (resource: string, params: UpdateParams) => {
      return await getData({
        method: "update",
        collection: resource,
        params: params,
      });
    },
    updateMany: async (resource: string, params: UpdateManyParams) => {
      return await getData({
        method: "updateMany",
        collection: resource,
        params: params,
      });
    },
    delete: async (resource: string, params: DeleteParams) => {
      return await getData({
        method: "delete",
        collection: resource,
        params: params,
      });
    },
    deleteMany: async (resource: string, params: DeleteManyParams) => {
      return await getData({
        method: "deleteMany",
        collection: resource,
        params: params,
      });
    },
  } as DataProvider;
}
