import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { CropAlert } from '../models/crop.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly STORAGE_KEY = 'cropdeal_price_alerts';
  private alertsSubject = new BehaviorSubject<CropAlert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  private alertCountSubject = new BehaviorSubject<number>(0);
  public alertCount$ = this.alertCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadAlertsFromStorage();
  }

  private loadAlertsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: CropAlert[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(a => !!a && a.id !== 'alt-1' && a.id !== 'alt-2' && a.id !== 'alt-3');
          this.alertsSubject.next(clean);
          this.alertCountSubject.next(clean.length);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clean));
          return;
        }
      }
    } catch (e) {
      console.warn('Failed parsing price alerts from localStorage', e);
    }

    this.alertsSubject.next([]);
    this.alertCountSubject.next(0);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
  }

  getAlerts(): CropAlert[] {
    return this.alertsSubject.value;
  }

  /**
   * Fetches real price alert subscriptions from backend price-alert-service.
   * If price-alert-service is stopped, this fails and does not fabricate alerts.
   */
  fetchUserSubscriptionsFromBackend(userId?: string | number): Observable<CropAlert[]> {
    const cleanUserId = parseInt(String(userId || '').replace(/\D/g, ''), 10) || 1;
    return this.http.get<any[]>(`${environment.apiUrl}/price-alerts/subscriptions/user/${cleanUserId}`).pipe(
      map(items => {
        if (!Array.isArray(items)) return [];
        return items.map(sub => {
          const isTriggered = sub.triggered || sub.status === 'TRIGGERED' || sub.lastNotifiedAt != null;
          return {
            id: 'alt-' + sub.id,
            userId: String(sub.userId),
            cropName: this.capitalize(sub.cropName),
            condition: (sub.priceCondition === 'LESS_THAN' || sub.priceCondition === 'LESS_THAN_OR_EQUAL') ? 'BELOW' : 'ABOVE',
            targetPrice: Number(sub.targetPrice),
            currentGovPrice: sub.matchedPrice ? Number(sub.matchedPrice) : undefined,
            status: isTriggered ? 'TRIGGERED' : 'ACTIVE',
            message: isTriggered
              ? `${this.capitalize(sub.cropName)} APMC rate matched your target of ₹${sub.targetPrice}/Kg!`
              : `Monitoring ${this.capitalize(sub.cropName)} against ₹${sub.targetPrice}/Kg target rate.`
          } as CropAlert;
        });
      }),
      tap(mapped => {
        if (mapped && mapped.length > 0) {
          this.alertsSubject.next(mapped);
          this.alertCountSubject.next(mapped.length);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mapped));
        }
      })
    );
  }

  addAlert(alert: CropAlert): Observable<any> {
    const numericUserId = parseInt(String(alert.userId || '').replace(/\D/g, ''), 10) || 1;
    const cond = alert.condition === 'BELOW' ? 'LESS_THAN_OR_EQUAL' : 'GREATER_THAN_OR_EQUAL';
    const subPayload = {
      userId: numericUserId,
      userRole: numericUserId === 2 ? 'DEALER' : 'FARMER',
      cropName: alert.cropName || 'Wheat',
      targetPrice: alert.targetPrice || 25,
      priceCondition: cond,
      district: null,
      state: null,
      unit: 'kg'
    };

    // Post subscription to backend price-alert-service via API Gateway
    return this.http.post<any>(`${environment.apiUrl}/price-alerts/subscriptions`, subPayload).pipe(
      tap((res) => {
        // Only update local state if backend successfully responded!
        const isTriggered = res && (res.triggered || res.status === 'TRIGGERED');
        alert.status = isTriggered ? 'TRIGGERED' : 'ACTIVE';
        if (res?.matchedPrice) alert.currentGovPrice = res.matchedPrice;
        if (res?.triggerMessage) alert.message = res.triggerMessage;

        const current = [alert, ...this.alertsSubject.value.filter(a => a.id !== alert.id)];
        this.alertsSubject.next(current);
        this.alertCountSubject.next(current.length);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(current));
      })
    );
  }

  evaluateDbRates(userId?: string | number): Observable<any> {
    const cleanUserId = parseInt(String(userId || '').replace(/\D/g, ''), 10) || 1;
    return this.http.post<any>(`${environment.apiUrl}/price-alerts/subscriptions/evaluate/user/${cleanUserId}`, {});
  }

  updateAlerts(alerts: CropAlert[]): void {
    this.alertsSubject.next(alerts);
    this.alertCountSubject.next(alerts.length);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(alerts));
  }

  /**
   * Permanently deletes an alert by its ID from local storage and backend.
   */
  deleteAlert(alertId: string): Observable<boolean> {
    const filtered = this.alertsSubject.value.filter(a => a.id !== alertId);
    this.alertsSubject.next(filtered);
    this.alertCountSubject.next(filtered.length);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

    const cleanId = parseInt(String(alertId || '').replace(/\D/g, ''), 10);
    const deleteUrl = cleanId ? `${environment.apiUrl}/price-alerts/subscriptions/${cleanId}` : `${environment.apiUrl}/price-alerts/${alertId}`;

    return this.http.delete(deleteUrl).pipe(
      map(() => true)
    );
  }

  clearAllAlerts(): void {
    this.alertsSubject.next([]);
    this.alertCountSubject.next(0);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
  }

  private capitalize(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
