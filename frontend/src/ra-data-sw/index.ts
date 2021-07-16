/* eslint-disable eqeqeq */
import { CreateParams, DataProvider, GetListParams, GetManyParams, GetOneParams } from "ra-core";
import { DeleteManyParams, DeleteParams, UpdateManyParams, UpdateParams } from "react-admin";
import { Workbox } from "workbox-window";

type SWDataProvider = DataProvider & { wb: () => Workbox };

export default function SWDataProvider(params: SWDataProviderParams): DataProvider {
  const wb = params.wb;
  return {
    getList: async (resource: string, params: GetListParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "getList",
        collection: resource,
        params: params,
      });
    },
    getOne: async (resource: string, params: GetOneParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "getOne",
        collection: resource,
        params: params,
      });
    },
    getMany: async (resource: string, params: GetManyParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "getMany",
        collection: resource,
        params: params,
      });
    },
    getManyReference: async (resource: string, params: any) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "getManyReference",
        collection: resource,
        params: params,
      });
    },
    create: async (resource: string, params: CreateParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "create",
        collection: resource,
        params: params,
      });
    },
    update: async (resource: string, params: UpdateParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "update",
        collection: resource,
        params: params,
      });
    },
    updateMany: async (resource: string, params: UpdateManyParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "updateMany",
        collection: resource,
        params: params,
      });
    },
    delete: async (resource: string, params: DeleteParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "delete",
        collection: resource,
        params: params,
      });
    },
    deleteMany: async (resource: string, params: DeleteManyParams) => {
      return await wb.messageSW({
        type: "DataProvider",
        method: "deleteMany",
        collection: resource,
        params: params,
      });
    },
    wb: () => {
      return wb;
    },
  } as SWDataProvider;
}

export interface SWDataProviderParams {
  wb: Workbox;
}
