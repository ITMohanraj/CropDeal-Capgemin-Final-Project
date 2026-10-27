import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CropSubscription } from '../models/subscription.model';
import { Crop } from '../models/crop.model';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private baseUrl = `${environment.apiUrl}/subscriptions`;
  private storageKeyPrefix = 'cropdeal_subscriptions_';
  private allCropsKey = 'cropdeal_recent_crops';
  private subscriptionsSubject = new BehaviorSubject<CropSubscription[]>([]);
  public subscriptions$ = this.subscriptionsSubject.asObservable();
  private currentDealerId = '';

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key && e.key.startsWith(this.storageKeyPrefix)) {
          if (this.currentDealerId && e.key === this.getKey(this.currentDealerId)) {
            this.subscriptionsSubject.next(this.getStoredSubscriptions(this.currentDealerId));
          }
        }
      });
    }
  }

  private getKey(dealerId: string): string {
    return `${this.storageKeyPrefix}${dealerId || 'default'}`;
  }

  public getStoredSubscriptions(dealerId: string): CropSubscription[] {
    // 1. Direct key match
    const primaryKey = this.getKey(dealerId);
    let raw = localStorage.getItem(primaryKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    // 2. Fallback: if not found, scan any cropdeal_subscriptions_ key
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.storageKeyPrefix)) {
        try {
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(list) && list.length > 0) {
            return list;
          }
        } catch (e) {}
      }
    }
    return [];
  }

  getSubscriptions(dealerId: string): Observable<CropSubscription[]> {
    this.currentDealerId = dealerId;
    const subs = this.getStoredSubscriptions(dealerId);
    this.subscriptionsSubject.next(subs);
    return of(subs);
  }

  saveSubscriptions(dealerId: string, subs: CropSubscription[]): void {
    localStorage.setItem(this.getKey(dealerId), JSON.stringify(subs));
    this.subscriptionsSubject.next(subs);
  }

  subscribe(sub: CropSubscription): Observable<CropSubscription> {
    const dealerId = sub.dealerId;
    let current: CropSubscription[] = this.getStoredSubscriptions(dealerId);
    // Prevent duplicate commodity
    current = current.filter(s => s.commodity.toLowerCase() !== sub.commodity.toLowerCase());
    current.unshift(sub);
    this.saveSubscriptions(dealerId, current);
    return of(sub);
  }

  unsubscribe(subId: string, dealerId: string): Observable<void> {
    const current: CropSubscription[] = this.getStoredSubscriptions(dealerId);
    const updated = current.filter(s => s.id !== subId);
    this.saveSubscriptions(dealerId, updated);
    return of(void 0);
  }

  /**
   * Save a newly posted crop to local cache so subscribed dealers can view it instantly.
   */
  recordCropPosting(crop: Crop): void {
    const raw = localStorage.getItem(this.allCropsKey);
    let list: Crop[] = raw ? JSON.parse(raw) : [];
    list.unshift(crop);
    localStorage.setItem(this.allCropsKey, JSON.stringify(list.slice(0, 50)));
  }

  /**
   * Notifies the posting farmer with a professional confirmation.
   * Real-time dealer price alerts are handled asynchronously by backend price-alert-service via RabbitMQ.
   */
  notifySubscribersOnNewCrop(newCrop: Crop): void {
    this.recordCropPosting(newCrop);

    // Confirmation notification for the farmer who posted the crop
    const farmerId = newCrop.farmerId || 'farmer-1';
    this.notificationService.sendNotification(
      farmerId,
      '🌾 Crop Listed Successfully',
      `Your harvest listing for ${newCrop.cropName} (${newCrop.quantity} ${newCrop.unit} at ₹${newCrop.pricePerUnit}/${newCrop.unit}) is now live on the marketplace.`,
      'SYSTEM'
    );
  }

  /**
   * Returns active harvest crops that match the dealer's active commodity subscriptions.
   * Matches only currently available, non-deleted crops from the active marketplace listings.
   */
  getMatchingCropsForDealer(dealerId: string, availableCrops: Crop[]): Observable<Crop[]> {
    const subs = this.getStoredSubscriptions(dealerId).filter(s => s.active !== false);
    if (subs.length === 0) return of([]);

    // Filter available crops directly from active marketplace list
    const candidates = (availableCrops || []).filter(c => {
      if (!c) return false;
      const status = String(c.status || 'AVAILABLE').toUpperCase();
      if (status === 'DELETED' || status === 'BLOCKED') return false;
      const qty = Number(c.quantity !== undefined ? c.quantity : (c.availableQuantity || 0));
      if (qty <= 0) return false;
      return true;
    });

    const uniqueMap = new Map<string, Crop>();
    candidates.forEach(c => {
      const idKey = String(c.id || c.cropId || `${c.cropName}_${c.location}`);
      if (!uniqueMap.has(idKey)) uniqueMap.set(idKey, c);
    });

    const filtered = Array.from(uniqueMap.values()).filter(crop => {
      const cropPrice = Number(crop.pricePerUnit !== undefined ? crop.pricePerUnit : ((crop as any).pricePerKg || 0));
      return subs.some(sub => {
        const comMatch = (crop.cropName || '').toLowerCase().includes(sub.commodity.toLowerCase()) ||
          sub.commodity.toLowerCase().includes((crop.cropName || '').toLowerCase()) ||
          (sub.category && crop.cropType && sub.category.toLowerCase() === crop.cropType.toLowerCase());
        if (!comMatch) return false;
        if (sub.maxBudgetPerUnit != null && sub.maxBudgetPerUnit > 0) {
          const maxPrice = sub.maxBudgetPerUnit > 150 ? sub.maxBudgetPerUnit / 100 : sub.maxBudgetPerUnit;
          if (cropPrice > maxPrice) return false;
        }
        return true;
      });
    });

    return of(filtered);
  }
}
