/**
 * Building type definitions based on API response structure
 */

export interface Building {
  id: string;
  title: { am: string; ru: string; en: string }; // Multi-lang
  address: { am: string; ru: string; en: string };
  location: { lat: number; lng: number };
  pricePerM2Min: number;
  pricePerM2Max: number;
  areaMin: number;
  areaMax: number;
  floors: number;
  commissioningDate: string;
  developer: { id: string; name: { am: string; ru: string; en: string } };
  region: { id: string; name: { am: string; ru: string; en: string } };
  primaryImage?: { id: string; thumbnailUrl: string };
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BuildingsResponse {
  data: Building[];
  pagination: PaginationMeta;
  meta?: {
    currency: string;
    exchangeRate: number;
    sort: string;
  };
}

/**
 * Filter parameters for building search
 */
export interface BuildingFilters {
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  region_id?: string;
  developer_id?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
