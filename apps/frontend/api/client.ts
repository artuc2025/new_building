/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface BuildingResponseDto {
  /** Building ID (UUID) */
  id: string;
  /** Building title in multiple languages */
  title: object;
  /** Building description in multiple languages */
  description?: object | null;
  /** Building address in multiple languages */
  address: object;
  /**
   * Geographic location
   * @example {"lat":40.1811,"lng":44.5144}
   */
  location: object;
  /** Address line 1 */
  addressLine1?: object | null;
  /** Address line 2 */
  addressLine2?: object | null;
  /** City */
  city: string;
  /** Postal code */
  postalCode?: object | null;
  /** Number of floors */
  floors: number;
  /** Total units */
  totalUnits?: object | null;
  /** Commissioning date */
  commissioningDate?: object | null;
  /** Construction status */
  constructionStatus?: "planned" | "under_construction" | "completed" | null;
  /** Minimum price per m² */
  pricePerM2Min?: object | null;
  /** Maximum price per m² */
  pricePerM2Max?: object | null;
  /** Minimum area (m²) */
  areaMin: number;
  /** Maximum area (m²) */
  areaMax: number;
  /** Currency code */
  currency: string;
  /** Developer ID (UUID) */
  developerId: string;
  /** Region ID (UUID) */
  regionId: string;
  /** Status */
  status: "draft" | "published" | "archived";
  /** Is featured */
  isFeatured?: object | null;
  /** Developer website URL */
  developerWebsiteUrl?: object | null;
  /** Developer Facebook URL */
  developerFacebookUrl?: object | null;
  /** Developer Instagram URL */
  developerInstagramUrl?: object | null;
  /** Created at timestamp */
  createdAt: string;
  /** Updated at timestamp */
  updatedAt: string;
  /** Published at timestamp */
  publishedAt?: string | null;
  /** Created by user ID (UUID) */
  createdBy?: object | null;
}

export interface PaginationMetaDto {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

export interface ResponseMetaDto {
  /**
   * Currency used for prices
   * @example "AMD"
   */
  currency: "AMD" | "USD";
  /**
   * Exchange rate used for currency conversion
   * @example 1
   */
  exchangeRate: number;
  /**
   * Sort option used
   * @example "date_desc"
   */
  sort: string;
}

export interface PaginatedBuildingsResponseDto {
  /** List of buildings */
  data: BuildingResponseDto[];
  /** Pagination metadata */
  pagination: PaginationMetaDto;
  /** Response metadata */
  meta: ResponseMetaDto;
}

export interface BuildingEnvelopeDto {
  /** Building data */
  data: BuildingResponseDto;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title API Gateway
 * @version 1.0
 * @contact
 *
 * API Gateway for New Building Portal
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * No description
     *
     * @tags buildings
     * @name ListingsControllerFindAll
     * @summary Get paginated list of buildings (public)
     * @request GET:/api/v1/buildings
     */
    listingsControllerFindAll: (
      query?: {
        /** Status filter (public endpoints only expose published buildings). Defaults to "published". */
        status?: "published";
        /** Bounding box filter: "minLng,minLat,maxLng,maxLat" */
        bbox?: string;
        /** Commissioning date to (ISO 8601 date string) */
        commissioning_date_to?: string;
        /** Commissioning date from (ISO 8601 date string) */
        commissioning_date_from?: string;
        /** Developer ID (UUID) */
        developer_id?: string;
        /** Region ID (UUID) */
        region_id?: string;
        /** Maximum number of floors */
        floors_max?: number;
        /** Minimum number of floors */
        floors_min?: number;
        /** Maximum area (m²) */
        area_max?: number;
        /** Minimum area (m²) */
        area_min?: number;
        /** Maximum price per m² (in selected currency) */
        price_max?: number;
        /** Minimum price per m² (in selected currency) */
        price_min?: number;
        /** Currency filter */
        currency?: "AMD" | "USD";
        /** Sort option */
        sort?:
          | "price_asc"
          | "price_desc"
          | "date_desc"
          | "date_asc"
          | "area_asc"
          | "area_desc";
        /** Items per page */
        limit?: number;
        /** Page number */
        page?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<PaginatedBuildingsResponseDto, void>({
        path: `/api/v1/buildings`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags buildings
     * @name ListingsControllerCreate
     * @summary Create a new building (admin only)
     * @request POST:/api/v1/buildings
     */
    listingsControllerCreate: (
      data: Record<string, any>,
      params: RequestParams = {},
    ) =>
      this.request<BuildingEnvelopeDto, void>({
        path: `/api/v1/buildings`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags buildings
     * @name ListingsControllerFindOne
     * @summary Get building by ID (public)
     * @request GET:/api/v1/buildings/{id}
     */
    listingsControllerFindOne: (
      id: string,
      query?: {
        /** Currency for price conversion */
        currency?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<BuildingEnvelopeDto, void>({
        path: `/api/v1/buildings/${id}`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags buildings
     * @name ListingsControllerUpdate
     * @summary Update building by ID (admin only)
     * @request PUT:/api/v1/buildings/{id}
     */
    listingsControllerUpdate: (
      id: string,
      data: Record<string, any>,
      params: RequestParams = {},
    ) =>
      this.request<BuildingEnvelopeDto, void>({
        path: `/api/v1/buildings/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags buildings
     * @name ListingsControllerRemove
     * @summary Delete building by ID (admin only)
     * @request DELETE:/api/v1/buildings/{id}
     */
    listingsControllerRemove: (id: string, params: RequestParams = {}) =>
      this.request<
        {
          data?: {
            /** @format uuid */
            id?: string;
            status?: "archived";
            /** @format date-time */
            deletedAt?: string;
          };
        },
        void
      >({
        path: `/api/v1/buildings/${id}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),
  };
  apiDocsJson = {
    /**
     * No description
     *
     * @name SwaggerControllerGetSwaggerJson
     * @request GET:/api-docs-json
     */
    swaggerControllerGetSwaggerJson: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api-docs-json`,
        method: "GET",
        ...params,
      }),
  };
}
