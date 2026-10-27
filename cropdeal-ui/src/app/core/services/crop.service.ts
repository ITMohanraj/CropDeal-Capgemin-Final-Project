import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { Crop, CropAlert, GovernmentPrice, MandiPriceRecord, PagedPriceResponse, SyncStatusResponse, PriceQueryParams, PriceRecommendationRequest, PriceRecommendationResponse } from '../models/crop.model';
import { environment } from '../../../environments/environment';
import { resolveCropImage } from '../utils/crop-image.util';

@Injectable({
  providedIn: 'root'
})
export class CropService {
  private baseUrl = `${environment.apiUrl}/crops`;
  private priceUrl = `${environment.apiUrl}/prices`;
  private readonly CROPS_KEY = 'cropdeal_crops_cache';
  private dbPriceCache: Map<string, number> = new Map([
    ['tomato', 26.0],
    ['watermelon', 13.0],
    ['watermelon', 13.0],
    ['tarbuj', 13.0],
    ['onion', 61.0],
    ['potato', 39.0],
    ['carrot', 41.0],
    ['wheat', 27.0]
  ]);
  private cropsSubject = new BehaviorSubject<Crop[]>(this.getLocalCrops());
  public crops$ = this.cropsSubject.asObservable();

  constructor(private http: HttpClient) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.DELETED_CROPS_KEY);
        const stored = localStorage.getItem('cropdeal_apmc_db_modal_prices');
        if (stored) {
          const parsed = JSON.parse(stored);
          for (const [k, v] of Object.entries(parsed)) {
            this.dbPriceCache.set(k, Number(v));
            this.mandiPriceCache.set(k, Number(v));
          }
        }
      } catch {}
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === this.CROPS_KEY) {
          this.cropsSubject.next(this.getLocalCrops());
        }
      });
    }
  }

  uploadCropImage(file: File): Observable<{ imageUrl: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string; filename: string }>(`${this.baseUrl}/upload-image`, formData);
  }

  private mandiPriceCache: Map<string, number> = new Map([
    ['tomato', 26.0],
    ['watermelon', 13.0],
    ['tarbuj', 13.0],
    ['onion', 61.0],
    ['potato', 39.0],
    ['carrot', 41.0],
    ['wheat', 27.0]
  ]);

  private readonly STANDARD_APMC_RATES: Record<string, number> = {
    'tomato': 26.0,
    'watermelon': 13.0,
    'water melon': 13.0,
    'tarbuj': 13.0,
    'carrot': 41.0,
    'onion': 61.0,
    'potato': 39.0,
    'wheat': 27.0,
    'rice': 22.0,
    'paddy': 21.0,
    'basmati': 42.0,
    'maize': 21.0,
    'corn': 21.0,
    'cotton': 72.0,
    'groundnut': 56.0,
    'peanut': 56.0,
    'turmeric': 102.0,
    'sugarcane': 4.0,
    'banana': 15.0,
    'chilli': 110.0,
    'chili': 110.0,
    'green chilli': 28.0,
    'red chilli': 135.0,
    'soybean': 48.0,
    'mustard': 54.0,
    'cabbage': 18.0,
    'cauliflower': 24.0,
    'cucumber': 16.0,
    'brinjal': 20.0,
    'eggplant': 20.0,
    'okra': 25.0,
    'ladyfinger': 25.0,
    'beetroot': 28.0,
    'radish': 16.0,
    'spinach': 15.0,
    'garlic': 120.0,
    'ginger': 85.0,
    'apple': 85.0,
    'mango': 65.0,
    'orange': 42.0,
    'grapes': 55.0,
    'lemon': 45.0,
    'papaya': 25.0,
    'guava': 35.0,
    'pineapple': 35.0,
    'pomegranate': 90.0,
    'coconut': 32.0,
    'drumstick': 38.0,
    'green peas': 36.0,
    'chana': 58.0,
    'bengal gram': 58.0,
    'moong': 78.0,
    'urad': 75.0,
    'toor': 95.0,
    'arhar': 95.0,
    'coffee': 180.0,
    'tea': 160.0,
    'black pepper': 450.0,
    'cardamom': 1200.0,
    'sweet potato': 22.0,
    'bitter gourd': 26.0,
    'bottle gourd': 18.0
  };

  public getApmcBenchmarkPrice(cropName: string | undefined | null, state?: string, district?: string): number {
    if (!cropName) return 25.0;
    const name = cropName.toLowerCase().trim();
    const clean = name.replace(/[^a-z0-9]/g, '');

    // 1. Check in-memory DB price cache
    if (this.dbPriceCache.has(clean)) {
      return this.dbPriceCache.get(clean)!;
    }

    // 2. Check in-memory mandi price cache
    if (this.mandiPriceCache.has(clean)) {
      return this.mandiPriceCache.get(clean)!;
    }

    // 3. Check localStorage cached Mandi prices (cropdeal_mandi_prices_v2)
    try {
      const stored = localStorage.getItem('cropdeal_mandi_prices_v2');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) {
          const match = list.find((p: any) => {
            const comm = (p.commodity || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return comm && (clean.includes(comm) || comm.includes(clean));
          });
          if (match) {
            const raw = match.modalPriceKg ?? match.modalPricePerKg ?? match.modalPrice;
            if (raw !== undefined && raw !== null) {
              const price = Number(raw > 200 ? raw / 100 : raw);
              if (price > 0) {
                this.dbPriceCache.set(clean, price);
                this.mandiPriceCache.set(clean, price);
                return price;
              }
            }
          }
        }
      }
    } catch {}

    // 4. Check curated APMC benchmark dictionary (aligned with DB rates)
    for (const [key, val] of Object.entries(this.STANDARD_APMC_RATES)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes(cleanKey) || cleanKey.includes(clean)) {
        this.mandiPriceCache.set(clean, val);
        return val;
      }
    }

    return 25.0;
  }

  public fetchApmcPriceFromDb(cropName: string | undefined | null, state?: string, district?: string, grade?: string): Observable<number> {
    if (!cropName) return of(25.0);

    const name = cropName.toLowerCase().trim();
    const cleanKey = name.replace(/[^a-z0-9]/g, '');

    // Normalize commodity name to match database table
    let normalizedCommodity = cropName.trim();
    if (cleanKey.includes('watermelon') || cleanKey.includes('tarbuj')) {
      normalizedCommodity = 'Water Melon';
    } else if (cleanKey.includes('tomato')) {
      normalizedCommodity = 'Tomato';
    } else if (cleanKey.includes('onion')) {
      normalizedCommodity = 'Onion';
    } else if (cleanKey.includes('potato')) {
      normalizedCommodity = 'Potato';
    } else if (cleanKey.includes('carrot')) {
      normalizedCommodity = 'Carrot';
    } else if (cleanKey.includes('wheat')) {
      normalizedCommodity = 'Wheat';
    }

    const cleanState = (state || 'Tamil Nadu').replace(/[\d\-]/g, '').trim();
    const cleanDistrict = (district || '').replace(/[\d\-]/g, '').trim();

    const payload = {
      commodity: normalizedCommodity,
      state: cleanState || 'Tamil Nadu',
      district: cleanDistrict || undefined,
      grade: grade || 'A'
    };

    return this.http.post<any>(`${this.priceUrl}/lookup`, payload).pipe(
      map(res => {
        const raw = res?.modalPricePerKg ?? res?.modalPrice ?? res?.referencePrice;
        if (raw !== undefined && raw !== null && Number(raw) > 0) {
          const price = Number(raw > 200 ? raw / 100 : raw);
          this.setDbCachedPrice(cleanKey, price);
          return price;
        }
        return this.getApmcBenchmarkPrice(cropName, state, district);
      }),
      catchError(() => {
        return this.http.get<any>(`${this.priceUrl}/commodity/${encodeURIComponent(normalizedCommodity)}`).pipe(
          map(res => {
            const raw = res?.modalPricePerKg ?? res?.modalPrice ?? res?.referencePrice;
            if (raw !== undefined && raw !== null && Number(raw) > 0) {
              const price = Number(raw > 200 ? raw / 100 : raw);
              this.setDbCachedPrice(cleanKey, price);
              return price;
            }
            return this.getApmcBenchmarkPrice(cropName, state, district);
          }),
          catchError(() => of(this.getApmcBenchmarkPrice(cropName, state, district)))
        );
      })
    );
  }

  public setDbCachedPrice(key: string, price: number): void {
    this.dbPriceCache.set(key, price);
    this.mandiPriceCache.set(key, price);
    try {
      const stored = localStorage.getItem('cropdeal_apmc_db_modal_prices');
      const obj = stored ? JSON.parse(stored) : {};
      obj[key] = price;
      localStorage.setItem('cropdeal_apmc_db_modal_prices', JSON.stringify(obj));
    } catch {}
  }

  public mapBackendCrop(c: any): Crop {
    if (!c) return {} as Crop;
    const cropName = c.cropName || c.commodity || 'Fresh Harvest';
    const rawQty = c.quantity !== undefined ? c.quantity : (c.availableQuantity !== undefined ? c.availableQuantity : 100);
    const qty = typeof rawQty === 'number' ? rawQty : Number(rawQty) || 100;
    const price = Number(c.pricePerUnit !== undefined ? c.pricePerUnit : (c.pricePerKg !== undefined ? c.pricePerKg : 20));
    const location = c.location || (c.district && c.state ? `${c.district}, ${c.state}` : (c.district || c.state || 'Local Mandi'));
    const farmerId = c.farmerId !== undefined && c.farmerId !== null ? String(c.farmerId) : '1';
    const farmerName = c.farmerName || 'Farmer Producer';
    const id = c.id !== undefined && c.id !== null ? String(c.id) : (c.cropId ? String(c.cropId) : `cr-${Date.now()}`);
    const rawStatus = (c.status || 'AVAILABLE').toUpperCase();
    const status = (rawStatus === 'PUBLISHED') ? 'AVAILABLE' : rawStatus;

    // Use authentic APMC modal price from DB
    const cleanKey = cropName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dbPrice = this.dbPriceCache.get(cleanKey);
    const resolvedApmcPrice = (c.govMspPrice !== undefined && c.govMspPrice !== null && Number(c.govMspPrice) > 0 && Number(c.govMspPrice) !== 25 && Number(c.govMspPrice) !== 9 && Number(c.govMspPrice) !== 28)
      ? Number(c.govMspPrice)
      : (dbPrice || this.getApmcBenchmarkPrice(cropName, c.state, c.district));

    return {
      id,
      cropId: id,
      cropName,
      cropType: c.cropType || 'Grains',
      variety: c.variety || 'Standard Grade A',
      quantity: qty,
      availableQuantity: qty,
      unit: c.unit || 'Kg',
      pricePerUnit: price,
      location,
      state: c.state || (c.location ? c.location.split(',')[1]?.trim() : undefined),
      district: c.district || (c.location ? c.location.split(',')[0]?.trim() : undefined),
      farmerId,
      farmerName,
      farmerPhone: c.farmerPhone,
      harvestDate: c.harvestDate,
      imageUrl: c.imageUrl || resolveCropImage(cropName),
      status: status,
      description: c.description || '',
      govMspPrice: resolvedApmcPrice,
      createdAt: c.createdAt || new Date().toISOString()
    };
  }

  refreshCrops(): Crop[] {
    const fresh = this.getLocalCrops();
    this.cropsSubject.next(fresh);
    return fresh;
  }

  public findCropIndex(list: Crop[], idOrName: string): number {
    if (!idOrName) return -1;
    const target = String(idOrName).trim().toLowerCase();
    return list.findIndex(c => {
      const cId = c.id !== undefined && c.id !== null ? String(c.id).trim().toLowerCase() : '';
      const cropId = c.cropId !== undefined && c.cropId !== null ? String(c.cropId).trim().toLowerCase() : '';
      const cName = c.cropName ? c.cropName.trim().toLowerCase() : '';
      return cId === target || cropId === target || cName === target ||
             (cName && target && (cName.includes(target) || target.includes(cName)));
    });
  }

  private readonly DELETED_CROPS_KEY = 'cropdeal_deleted_crop_ids';

  public getDeletedCropIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.DELETED_CROPS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr.map(String));
      }
    } catch {}
    return new Set<string>();
  }

  public markCropAsDeleted(id: string): void {
    try {
      const deleted = this.getDeletedCropIds();
      deleted.add(String(id));
      localStorage.setItem(this.DELETED_CROPS_KEY, JSON.stringify(Array.from(deleted)));
    } catch {}
  }

  public getDefaultSeedCrops(): Crop[] {
    return [];
  }

  public getLocalCrops(): Crop[] {
    try {
      const raw = localStorage.getItem(this.CROPS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed
            .filter(c => c.status !== 'DELETED')
            .map(c => {
              const cleanKey = (c.cropName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const dbPrice = this.dbPriceCache.get(cleanKey);
              const apmc = dbPrice || (!c.govMspPrice || c.govMspPrice === 25 || c.govMspPrice === 28 || c.govMspPrice === 9
                ? this.getApmcBenchmarkPrice(c.cropName, c.state, c.district)
                : c.govMspPrice);
              return {
                ...c,
                govMspPrice: apmc,
                imageUrl: (c.imageUrl && !c.imageUrl.includes('crop-wheat.jpg')) ? c.imageUrl : resolveCropImage(c.cropName)
              };
            });
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return [];
  }

  private saveLocalCrops(crops: Crop[]): void {
    try {
      const activeOnly = (crops || []).filter(c => c.status !== 'DELETED');
      localStorage.setItem(this.CROPS_KEY, JSON.stringify(activeOnly));
      this.cropsSubject.next(activeOnly);
    } catch {}
  }

  getAllCrops(): Observable<Crop[]> {
    return this.http.get<any[]>(this.baseUrl).pipe(
      switchMap(items => {
        if (!Array.isArray(items) || items.length === 0) {
          this.saveLocalCrops([]);
          this.cropsSubject.next([]);
          return of([]);
        }
        const cropObservables = items.map(c => {
          const mapped = this.mapBackendCrop(c);
          return this.fetchApmcPriceFromDb(mapped.cropName, mapped.state, mapped.district, c.grade).pipe(
            map(dbPrice => {
              if (dbPrice && dbPrice > 0) {
                mapped.govMspPrice = dbPrice;
              }
              return mapped;
            }),
            catchError(() => of(mapped))
          );
        });
        return forkJoin(cropObservables);
      }),
      tap(crops => {
        const active = crops.filter(c => c.status !== 'DELETED');
        this.saveLocalCrops(active);
        this.cropsSubject.next(active);
      }),
      catchError(() => of(this.getLocalCrops()))
    );
  }

  getCropById(id: string): Observable<Crop> {
    const deleted = this.getDeletedCropIds();
    if (deleted.has(String(id))) {
      return of({} as Crop);
    }
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      switchMap(res => {
        const mapped = this.mapBackendCrop(res);
        if (deleted.has(String(mapped.id)) || deleted.has(String(mapped.cropId))) {
          return of({} as Crop);
        }
        return this.fetchApmcPriceFromDb(mapped.cropName, mapped.state, mapped.district, res.grade).pipe(
          map(dbPrice => {
            if (dbPrice > 0) mapped.govMspPrice = dbPrice;
            return mapped;
          }),
          catchError(() => of(mapped))
        );
      }),
      catchError(() => {
        const found = this.getLocalCrops().find(c => c.id === id || c.cropId === id || c.cropName?.toLowerCase() === id?.toLowerCase());
        return of(found || ({} as Crop));
      })
    );
  }

  getCropsByFarmer(farmerId: string): Observable<Crop[]> {
    const fId = String(farmerId).trim();
    return this.http.get<any[]>(`${this.baseUrl}/farmer/${fId}`).pipe(
      map(items => {
        if (Array.isArray(items)) {
          return items.map(c => this.mapBackendCrop(c));
        }
        return this.getLocalCrops().filter(c => String(c.farmerId) === fId);
      }),
      catchError(() => {
        const list = this.getLocalCrops().filter(c => String(c.farmerId) === fId);
        return of(list);
      })
    );
  }

  addCrop(crop: Partial<Crop>): Observable<Crop> {
    const qty = crop.quantity || crop.availableQuantity || 100;
    const price = crop.pricePerUnit || 20;
    const name = crop.cropName || 'Fresh Harvest';
    const loc = crop.location || 'Local Mandi';
    const fId = crop.farmerId || '1';
    const fName = crop.farmerName || 'Farmer Producer';

    const payload: any = {
      ...crop,
      farmerId: fId,
      commodity: name,
      cropName: name,
      grade: 'A',
      quantity: qty,
      unit: crop.unit || 'KG',
      pricePerKg: price,
      pricePerUnit: price,
      location: loc,
      farmerName: fName,
      imageUrl: crop.imageUrl || resolveCropImage(name),
      description: crop.description || ''
    };

    return this.http.post<any>(this.baseUrl, payload).pipe(
      map(res => {
        const mapped = this.mapBackendCrop(res || payload);
        const current = [mapped, ...this.getLocalCrops().filter(c => c.id !== mapped.id)];
        this.saveLocalCrops(current);
        return mapped;
      }),
      catchError(() => {
        const fallback = this.mapBackendCrop(payload);
        const current = [fallback, ...this.getLocalCrops().filter(c => c.id !== fallback.id)];
        this.saveLocalCrops(current);
        return of(fallback);
      })
    );
  }

  updateCrop(id: string, crop: Partial<Crop>): Observable<Crop> {
    const list = this.getLocalCrops();
    const idx = this.findCropIndex(list, id);
    const qty = crop.quantity !== undefined ? crop.quantity : crop.availableQuantity;
    const finalCrop = { ...crop };
    if (qty !== undefined) {
      finalCrop.quantity = qty;
      finalCrop.availableQuantity = qty;
    }
    let updatedCrop: Crop = idx >= 0 ? { ...list[idx], ...finalCrop } : ({ ...finalCrop, id } as Crop);
    if (idx >= 0) {
      if (qty !== undefined && qty <= 0) {
        return this.deleteCrop(id).pipe(map(() => updatedCrop));
      }
      list[idx] = updatedCrop;
      this.saveLocalCrops(list);
    }

    return this.http.put<Crop>(`${this.baseUrl}/${id}`, crop).pipe(
      catchError(() => of(updatedCrop))
    );
  }

  deleteCrop(id: string): Observable<void> {
    this.markCropAsDeleted(id);
    const list = this.getLocalCrops();
    const target = String(id).trim().toLowerCase();
    const filtered = list.filter(c => {
      const cId = c.id !== undefined && c.id !== null ? String(c.id).trim().toLowerCase() : '';
      const cropId = c.cropId !== undefined && c.cropId !== null ? String(c.cropId).trim().toLowerCase() : '';
      const cName = c.cropName ? c.cropName.trim().toLowerCase() : '';
      const isMatch = cId === target || cropId === target || (target && cName === target);
      if (isMatch) {
        if (c.id) this.markCropAsDeleted(String(c.id));
        if (c.cropId) this.markCropAsDeleted(String(c.cropId));
      }
      return !isMatch;
    });
    this.saveLocalCrops(filtered);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cropdeal:crop_deleted', { detail: { id } }));
    }

    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError(() => of(undefined as any))
    );
  }

  reduceQuantity(id: string, purchasedQuantity: number): Observable<any> {
    const list = this.getLocalCrops();
    const idx = this.findCropIndex(list, id);
    if (idx >= 0) {
      const current = list[idx].quantity !== undefined ? list[idx].quantity : (list[idx].availableQuantity || 0);
      const remaining = Math.max(0, current - purchasedQuantity);
      if (remaining <= 0) {
        return this.deleteCrop(id);
      } else {
        list[idx] = { ...list[idx], quantity: remaining, availableQuantity: remaining };
        this.saveLocalCrops(list);
      }
    }
    const numId = Number(id);
    if (!isNaN(numId) && numId > 0) {
      return this.http.patch(`${this.baseUrl}/${id}/quantity`, { purchasedQuantity }).pipe(
        catchError(() => of(null))
      );
    }
    return of(null);
  }

  deductCropStock(idOrName: string, purchasedQuantity: number): { remaining: number; deleted: boolean } {
    const list = this.getLocalCrops();
    const idx = this.findCropIndex(list, idOrName);
    if (idx === -1) {
      return { remaining: 0, deleted: false };
    }
    const current = list[idx].quantity !== undefined ? list[idx].quantity : (list[idx].availableQuantity || 0);
    const remaining = Math.max(0, current - purchasedQuantity);
    const targetId = String(list[idx].id || list[idx].cropId || idOrName);

    if (remaining <= 0) {
      this.deleteCrop(targetId).subscribe();
      return { remaining: 0, deleted: true };
    } else {
      list[idx] = { ...list[idx], quantity: remaining, availableQuantity: remaining };
      this.saveLocalCrops(list);
      this.http.patch(`${this.baseUrl}/${targetId}/quantity`, { purchasedQuantity }).pipe(
        catchError(() => of(null))
      ).subscribe();
      return { remaining, deleted: false };
    }
  }

  // APMC Government Market Prices
  getGovernmentPrices(): Observable<GovernmentPrice[]> {
    return this.http.get<GovernmentPrice[]>(`${this.priceUrl}/all`).pipe(
      catchError(() => of([]))
    );
  }

  getPricesPaged(params: PriceQueryParams = {}): Observable<PagedPriceResponse> {
    let queryParams: any = {};
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.size !== undefined) queryParams.size = params.size;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.direction) queryParams.direction = params.direction;
    if (params.state && params.state !== 'All States' && params.state !== 'All') queryParams.state = params.state;
    if (params.district && params.district !== 'All Districts' && params.district !== 'All') queryParams.district = params.district;
    if (params.market && params.market !== 'All Markets' && params.market !== 'All') queryParams.market = params.market;
    if (params.commodity && params.commodity !== 'All Commodities' && params.commodity !== 'All') queryParams.commodity = params.commodity;
    if (params.arrivalDate) queryParams.arrivalDate = params.arrivalDate;
    if (params.search) queryParams.search = params.search;

    return this.http.get<PagedPriceResponse>(this.priceUrl, { params: queryParams }).pipe(
      catchError(err => of({
        content: [],
        page: 0,
        size: params.size || 25,
        totalElements: 0,
        totalPages: 0,
        last: true
      }))
    );
  }

  getSyncStatus(): Observable<SyncStatusResponse> {
    return this.http.get<SyncStatusResponse>(`${this.priceUrl}/sync-status`).pipe(
      catchError(err => of({
        lastSuccessfulSyncAt: null,
        syncStatus: 'UNKNOWN',
        recordsFetched: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        lastError: err?.message || 'Failed to fetch sync status'
      }))
    );
  }

  getDistinctCommodities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.priceUrl}/distinct/commodities`).pipe(
      catchError(() => of([]))
    );
  }

  getDistinctMarkets(district?: string): Observable<string[]> {
    const params: any = {};
    if (district && district !== 'All Districts' && district !== 'All') {
      params.district = district;
    }
    return this.http.get<string[]>(`${this.priceUrl}/distinct/markets`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  syncGovernmentPrices(role?: string, token?: string | null): Observable<any> {
    const headers: any = {};
    if (role) {
      headers['X-User-Role'] = role;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.http.post<any>(`${this.priceUrl}/sync`, {}, { headers }).pipe(
      catchError(err => of({
        error: err?.error?.message || err?.message || 'Failed to trigger synchronization',
        failed: true
      }))
    );
  }

  getGovernmentPriceByCommodity(commodity: string): Observable<GovernmentPrice[]> {
    return this.http.get<GovernmentPrice[]>(`${this.priceUrl}/commodity/${commodity}`).pipe(
      catchError(() => of([]))
    );
  }

  // Crop Price Alert endpoints - asynchronously evaluates user alerts via RabbitMQ
  checkLoginPriceAlerts(userId: string): Observable<any> {
    const cleanId = parseInt(String(userId || '').replace(/\D/g, ''), 10) || userId;
    return this.http.get<any>(`${environment.apiUrl}/price-alerts/match/check-on-login/${cleanId}`).pipe(
      catchError(() => of(null))
    );
  }

  getUserPriceAlerts(userId: string): Observable<CropAlert[]> {
    return this.http.get<CropAlert[]>(`${this.priceUrl}/alerts/user/${userId}`).pipe(
      catchError(() => of([]))
    );
  }

  createPriceAlert(alert: Partial<CropAlert>): Observable<CropAlert> {
    return this.http.post<CropAlert>(`${this.priceUrl}/alerts`, alert).pipe(
      catchError(() => of(alert as CropAlert))
    );
  }

  deletePriceAlert(alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.priceUrl}/alerts/${alertId}`).pipe(
      catchError(() => of(undefined as any))
    );
  }

  getPriceRecommendation(request: PriceRecommendationRequest): Observable<PriceRecommendationResponse> {
    return this.http.post<PriceRecommendationResponse>(`${this.priceUrl}/recommendation`, request).pipe(
      catchError(err => of({
        commodity: request.commodity,
        recommendedPricePerKg: null,
        minPricePerKg: null,
        maxPricePerKg: null,
        currency: 'INR',
        unit: 'kg',
        sourceMarket: null,
        sourceDistrict: null,
        sourceState: null,
        sourceArrivalDate: null,
        matchType: 'NO_DATA',
        matchTypeLabel: 'No Reliable Price Available',
        distanceKm: null,
        fallback: true,
        message: 'Unable to reach price recommendation service. You can set your selling price manually.',
        confidence: 'NONE'
      } as PriceRecommendationResponse))
    );
  }

  getDistinctStates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.priceUrl}/distinct/states`).pipe(
      catchError(() => of([]))
    );
  }

  getDistinctDistricts(state?: string): Observable<string[]> {
    const params = state ? `?state=${encodeURIComponent(state)}` : '';
    return this.http.get<string[]>(`${this.priceUrl}/distinct/districts${params}`).pipe(
      catchError(() => of([]))
    );
  }
}
