import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of, map, catchError } from 'rxjs';
import { AppNotification } from '../models/notification.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/notifications`;

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Purge any legacy client-side localStorage notification caches
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('cropdeal_notifications_') || key.startsWith('cropdeal_notif_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Notice: localStorage purge encountered non-fatal error:', e);
      }
    }
  }

  /**
   * Fetches real notifications directly from backend notification-service.
   * If notification-service is stopped or down, returns empty list (NO localStorage fallback).
   */
  getUserNotifications(userId: string): Observable<AppNotification[]> {
    if (!userId) {
      this.clearStream();
      return of([]);
    }

    return this.http.get<any[]>(`${this.baseUrl}/user/${userId}`).pipe(
      map(items => {
        if (!Array.isArray(items)) return [];
        return items.map(n => ({
          id: String(n.id || ''),
          userId: String(n.userId || n.recipient || userId),
          title: n.title || (n.type === 'PRICE_ALERT' ? '🌾 Mandi Price Alert' : (n.type || 'System Notification')),
          message: n.message || '',
          type: (n.type || 'SYSTEM') as any,
          isRead: Boolean(n.isRead),
          createdAt: n.createdAt ? String(n.createdAt) : new Date().toISOString()
        } as AppNotification));
      }),
      tap(notifications => {
        this.notificationsSubject.next(notifications);
        const unreadCount = notifications.filter(n => !n.isRead).length;
        this.unreadCountSubject.next(unreadCount);
      }),
      catchError(err => {
        console.warn('Notification service unreachable or offline. Clearing notification stream.', err?.message);
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
        return of([]);
      })
    );
  }

  clearStream(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  markAsRead(notificationId: string, userId?: string): Observable<void> {
    const current = this.notificationsSubject.value.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    this.notificationsSubject.next(current);
    this.unreadCountSubject.next(current.filter(n => !n.isRead).length);

    return this.http.put<void>(`${this.baseUrl}/${notificationId}/read`, {}).pipe(
      catchError(() => of(undefined as any))
    );
  }

  deleteNotification(notificationId: string, userId?: string): Observable<boolean> {
    const updated = this.notificationsSubject.value.filter(n => n.id !== notificationId);
    this.notificationsSubject.next(updated);
    this.unreadCountSubject.next(updated.filter(n => !n.isRead).length);

    return this.http.delete<void>(`${this.baseUrl}/${notificationId}`).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  markAllAsRead(userId?: string): void {
    const current = this.notificationsSubject.value.map(n => ({ ...n, isRead: true }));
    this.notificationsSubject.next(current);
    this.unreadCountSubject.next(0);

    const targetUser = userId || 'me';
    this.http.put(`${this.baseUrl}/user/${targetUser}/read-all`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  clearAllNotifications(userId?: string): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);

    const targetUser = userId || 'me';
    this.http.delete(`${this.baseUrl}/user/${targetUser}/clear-all`).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  /**
   * For backwards compatibility: dispatches notification to backend notification-service.
   * Does NOT persist to localStorage.
   */
  addClientNotification(notification: AppNotification, userId?: string): void {
    this.sendNotification(
      userId || notification.userId,
      notification.title,
      notification.message,
      notification.type
    );
  }

  /**
   * Dispatches notification to backend notification-service via RabbitMQ message queue.
   * Does NOT store in localStorage.
   */
  sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'ORDER' | 'NEGOTIATION' | 'BID' | 'PRICE_ALERT' | 'WALLET' | 'DELIVERY' | 'SYSTEM',
    targetRole?: 'farmer' | 'dealer' | 'delivery' | 'admin'
  ): void {
    const payload = {
      recipient: userId,
      title: title,
      message: message,
      type: type || 'SYSTEM'
    };

    this.http.post(`${this.baseUrl}`, payload).pipe(
      catchError(err => {
        console.warn('Notice: Backend notification queue dispatch error (service may be stopped):', err?.message);
        return of(null);
      })
    ).subscribe();
  }
}
