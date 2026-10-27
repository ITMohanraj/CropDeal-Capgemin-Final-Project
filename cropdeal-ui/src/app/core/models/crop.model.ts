export interface Crop {
  id?: string;
  cropId?: string;
  farmerId?: string;
  farmerName?: string;
  farmerPhone?: string;
  cropName: string;
  variety?: string;
  cropType: string;
  quantity: number;
  availableQuantity?: number;
  unit: string; // kg
  pricePerUnit: number;
  location: string;
  state?: string;
  district?: string;
  harvestDate?: string;
  imageUrl?: string;
  status: 'AVAILABLE' | 'SOLD' | 'IN_NEGOTIATION' | 'AUCTION' | 'BLOCKED' | 'DELETED';
  description?: string;
  govMspPrice?: number;
  recommendedPrice?: number;
  mandiPriceMatch?: string;
  sourceMarket?: string;
  sourceDistrict?: string;
  sourceArrivalDate?: string;
  sourceDistanceKm?: number;
  createdAt?: string;
}

export interface GovernmentPrice {
  id?: string;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety?: string;
  grade?: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  recordDate: string;
}

export interface MandiPriceRecord {
  id: number;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety?: string;
  grade?: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  sourceUnit?: string;
  kgPerUnit?: number;
  minPricePerKg: number;
  maxPricePerKg: number;
  modalPricePerKg: number;
}

export interface PagedPriceResponse {
  content: MandiPriceRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface SyncStatusResponse {
  lastSuccessfulSyncAt: string | null;
  syncStatus: string;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  lastError: string | null;
}

export interface PriceQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  arrivalDate?: string;
  search?: string;
}

export interface CropAlert {
  id?: string;
  userId: string;
  cropName: string;
  targetPrice: number;
  currentGovPrice?: number;
  condition: 'ABOVE' | 'BELOW';
  status: 'ACTIVE' | 'TRIGGERED';
  message?: string;
}

export interface PriceRecommendationRequest {
  commodity: string;
  state?: string;
  district?: string;
  market?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  variety?: string;
  grade?: string;
}

export interface PriceRecommendationResponse {
  commodity: string;
  recommendedPricePerKg: number | null;
  minPricePerKg: number | null;
  maxPricePerKg: number | null;
  currency: string;
  unit: string;
  sourceMarket: string | null;
  sourceDistrict: string | null;
  sourceState: string | null;
  sourceArrivalDate: string | null;
  matchType: 'SAME_DISTRICT' | 'NEAREST_MARKET' | 'REGIONAL_ESTIMATE' | 'NO_DATA';
  matchTypeLabel: string;
  distanceKm: number | null;
  fallback: boolean;
  message: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}
