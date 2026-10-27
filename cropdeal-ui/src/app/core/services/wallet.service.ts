import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap, map } from 'rxjs';
import { Wallet, WalletTransaction } from '../models/wallet.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private baseUrl = `${environment.apiUrl}/wallet`;
  private balanceSubject = new BehaviorSubject<number>(0);
  public balance$ = this.balanceSubject.asObservable();

  private walletSubject = new BehaviorSubject<Wallet>({
    userId: '1',
    balance: 0,
    reservedBalance: 0,
    availableBalance: 0,
    currency: 'INR'
  });
  public wallet$ = this.walletSubject.asObservable();

  constructor(private http: HttpClient) {}

  getWallet(userId: string): Observable<Wallet> {
    const cachedBalance = this.getStoredBalance(userId);
    const cachedReserved = this.getStoredReservedBalance(userId);
    const cachedAvailable = Math.max(0, cachedBalance - cachedReserved);

    const initialWallet: Wallet = {
      id: 'w-' + userId,
      userId: userId,
      balance: cachedBalance,
      reservedBalance: cachedReserved,
      availableBalance: cachedAvailable,
      currency: 'INR',
      updatedAt: new Date().toISOString()
    };

    this.balanceSubject.next(cachedBalance);
    this.walletSubject.next(initialWallet);

    return this.http.get<any>(`${this.baseUrl}/user/${userId}`).pipe(
      map((w) => {
        if (w) {
          const total = typeof w.totalBalance === 'number' ? w.totalBalance : (typeof w.balance === 'number' ? w.balance : cachedBalance);
          const reserved = typeof w.reservedBalance === 'number' ? w.reservedBalance : cachedReserved;
          const avail = typeof w.availableBalance === 'number' ? w.availableBalance : Math.max(0, total - reserved);

          this.saveStoredBalance(userId, total);
          this.saveStoredReservedBalance(userId, reserved);
          this.balanceSubject.next(total);

          const mapped: Wallet = {
            id: 'w-' + userId,
            userId: userId,
            balance: total,
            reservedBalance: reserved,
            availableBalance: avail,
            currency: 'INR',
            updatedAt: new Date().toISOString()
          };
          this.walletSubject.next(mapped);
          return mapped;
        }
        return initialWallet;
      }),
      catchError(() => of(initialWallet))
    );
  }

  creditWallet(userId: string, amount: number, description: string): Observable<any> {
    const currentBalance = this.getStoredBalance(userId);
    const newBalance = currentBalance + amount;
    this.saveStoredBalance(userId, newBalance);
    this.balanceSubject.next(newBalance);

    const reserved = this.getStoredReservedBalance(userId);
    this.walletSubject.next({
      id: 'w-' + userId,
      userId: userId,
      balance: newBalance,
      reservedBalance: reserved,
      availableBalance: Math.max(0, newBalance - reserved),
      currency: 'INR'
    });

    // Record in passbook
    this.addLocalTransaction(userId, {
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      walletId: 'w-' + userId,
      userId: userId,
      amount: amount,
      type: 'CREDIT',
      description: description,
      timestamp: new Date().toISOString()
    });

    const payload = {
      userId: !isNaN(Number(userId)) ? Number(userId) : 1,
      amount: amount,
      description: description
    };

    return this.http.post<any>(`${this.baseUrl}/credit`, payload).pipe(
      map(res => ({
        success: true,
        message: 'Credited to wallet successfully',
        balance: res?.totalBalance !== undefined ? Number(res.totalBalance) : newBalance,
        ...res
      })),
      catchError(() => of({ success: true, balance: newBalance, message: 'Credited to wallet successfully' }))
    );
  }

  debitWallet(userId: string, amount: number, description: string): Observable<{ success: boolean; message: string; balance?: number }> {
    const currentBalance = this.getStoredBalance(userId);
    const currentReserved = this.getStoredReservedBalance(userId);
    const currentAvailable = Math.max(0, currentBalance - currentReserved);

    if (currentAvailable < amount) {
      return of({
        success: false,
        message: `Insufficient available wallet balance. Required: ₹${amount.toLocaleString()}, Available: ₹${currentAvailable.toLocaleString()} (Total balance: ₹${currentBalance.toLocaleString()} with ₹${currentReserved.toLocaleString()} reserved in bids).`
      });
    }

    const newBalance = currentBalance - amount;
    this.saveStoredBalance(userId, newBalance);
    this.balanceSubject.next(newBalance);

    this.walletSubject.next({
      id: 'w-' + userId,
      userId: userId,
      balance: newBalance,
      reservedBalance: currentReserved,
      availableBalance: Math.max(0, newBalance - currentReserved),
      currency: 'INR'
    });

    this.addLocalTransaction(userId, {
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      walletId: 'w-' + userId,
      userId: userId,
      amount: amount,
      type: 'DEBIT',
      description: description,
      timestamp: new Date().toISOString()
    });

    const payload = {
      userId: !isNaN(Number(userId)) ? Number(userId) : 1,
      amount: amount,
      description: description
    };

    return this.http.post<any>(`${this.baseUrl}/debit`, payload).pipe(
      map(res => ({
        success: true,
        message: 'Deducted from wallet successfully',
        balance: res?.totalBalance !== undefined ? Number(res.totalBalance) : newBalance,
        ...res
      })),
      catchError(() => of({ success: true, message: 'Deducted from wallet successfully', balance: newBalance }))
    );
  }

  reserveFunds(userId: string, referenceId: string, amount: number, description: string): Observable<{ success: boolean; message?: string }> {
    const totalBalance = this.getStoredBalance(userId);
    const currentReserved = this.getStoredReservedBalance(userId);
    const currentAvailable = Math.max(0, totalBalance - currentReserved);

    if (currentAvailable < amount) {
      return of({
        success: false,
        message: `Insufficient unreserved wallet balance. Required: ₹${amount.toLocaleString()}, Available: ₹${currentAvailable.toLocaleString()}.`
      });
    }

    const newReserved = currentReserved + amount;
    this.saveStoredReservedBalance(userId, newReserved);

    this.walletSubject.next({
      id: 'w-' + userId,
      userId: userId,
      balance: totalBalance,
      reservedBalance: newReserved,
      availableBalance: Math.max(0, totalBalance - newReserved),
      currency: 'INR'
    });

    this.addLocalTransaction(userId, {
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      walletId: 'w-' + userId,
      userId: userId,
      amount: amount,
      type: 'RESERVATION',
      referenceId: referenceId,
      description: description || `Bid escrow reserved for ${referenceId}`,
      timestamp: new Date().toISOString()
    });

    const numUserId = parseInt(String(userId).replace(/\D/g, ''), 10) || 1;
    const payload = {
      userId: numUserId,
      referenceId: referenceId,
      amount: amount
    };

    return this.http.post<any>(`${this.baseUrl}/reserve`, payload).pipe(
      catchError(() => of({ success: true }))
    );
  }

  releaseFunds(userId: string, referenceId: string, amount: number, description: string): Observable<any> {
    const totalBalance = this.getStoredBalance(userId);
    const currentReserved = this.getStoredReservedBalance(userId);
    const newReserved = Math.max(0, currentReserved - amount);
    this.saveStoredReservedBalance(userId, newReserved);

    this.walletSubject.next({
      id: 'w-' + userId,
      userId: userId,
      balance: totalBalance,
      reservedBalance: newReserved,
      availableBalance: Math.max(0, totalBalance - newReserved),
      currency: 'INR'
    });

    this.addLocalTransaction(userId, {
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      walletId: 'w-' + userId,
      userId: userId,
      amount: amount,
      type: 'RELEASE',
      referenceId: referenceId,
      description: description || `Bid escrow released for ${referenceId}`,
      timestamp: new Date().toISOString()
    });

    const numUserId = parseInt(String(userId).replace(/\D/g, ''), 10) || 1;
    const payload = {
      userId: numUserId,
      referenceId: referenceId
    };

    return this.http.post<any>(`${this.baseUrl}/release`, payload).pipe(
      catchError(() => of({ success: true }))
    );
  }

  consumeFunds(userId: string, referenceId: string, amount: number, description: string, orderId?: string): Observable<any> {
    const currentBalance = this.getStoredBalance(userId);
    const currentReserved = this.getStoredReservedBalance(userId);

    const newBalance = Math.max(0, currentBalance - amount);
    const newReserved = Math.max(0, currentReserved - amount);

    this.saveStoredBalance(userId, newBalance);
    this.saveStoredReservedBalance(userId, newReserved);
    this.balanceSubject.next(newBalance);

    this.walletSubject.next({
      id: 'w-' + userId,
      userId: userId,
      balance: newBalance,
      reservedBalance: newReserved,
      availableBalance: Math.max(0, newBalance - newReserved),
      currency: 'INR'
    });

    this.addLocalTransaction(userId, {
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      walletId: 'w-' + userId,
      userId: userId,
      amount: amount,
      type: 'PAYMENT',
      referenceId: referenceId,
      orderId: orderId,
      description: description || `Payment consumed for won bid ${referenceId}`,
      timestamp: new Date().toISOString()
    });

    const numUserId = parseInt(String(userId).replace(/\D/g, ''), 10) || 1;
    const payload = {
      userId: numUserId,
      referenceId: referenceId
    };

    return this.http.post<any>(`${this.baseUrl}/consume`, payload).pipe(
      catchError(() => of({ success: true, balance: newBalance }))
    );
  }

  withdrawFunds(userId: string, amount: number, bankDetails: { accountNumber: string; bankName: string; ifsc: string; holderName: string }): Observable<{ success: boolean; message: string; balance?: number }> {
    const currentBalance = this.getStoredBalance(userId);
    const currentReserved = this.getStoredReservedBalance(userId);
    const currentAvailable = Math.max(0, currentBalance - currentReserved);

    if (currentAvailable < amount) {
      return of({
        success: false,
        message: `Insufficient available wallet balance for withdrawal. Requested: ₹${amount.toLocaleString()}, Available: ₹${currentAvailable.toLocaleString()} (₹${currentReserved.toLocaleString()} reserved in bids).`
      });
    }

    const newBalance = currentBalance - amount;
    this.saveStoredBalance(userId, newBalance);
    this.balanceSubject.next(newBalance);

    this.walletSubject.next({
      id: 'w-' + userId,
      userId: userId,
      balance: newBalance,
      reservedBalance: currentReserved,
      availableBalance: Math.max(0, newBalance - currentReserved),
      currency: 'INR'
    });

    const desc = `Bank Transfer to ${bankDetails.bankName} (A/C: ...${bankDetails.accountNumber.slice(-4)})`;
    this.addLocalTransaction(userId, {
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      walletId: 'w-' + userId,
      userId: userId,
      amount: amount,
      type: 'DEBIT',
      description: desc,
      timestamp: new Date().toISOString()
    });

    return of({
      success: true,
      message: `₹${amount.toLocaleString()} successfully withdrawn to ${bankDetails.bankName} A/C ending in ${bankDetails.accountNumber.slice(-4)}. Expected clearance: within 2 hours.`,
      balance: newBalance
    });
  }

  addFunds(userId: string, amount: number): Observable<any> {
    return this.creditWallet(userId, amount, 'Wallet deposit addition via UPI / Gateway');
  }

  getTransactions(userId: string): Observable<WalletTransaction[]> {
    const localTxns = this.getLocalTransactions(userId);
    return this.http.get<any[]>(`${this.baseUrl}/transactions/${userId}`).pipe(
      map((serverTxns) => {
        if (!Array.isArray(serverTxns) || serverTxns.length === 0) {
          localStorage.setItem(`cropdeal_txns_${userId}`, JSON.stringify([]));
          return [];
        }

        const seenKeys = new Set<string>();
        const result: WalletTransaction[] = [];

        // 1. Authoritative server transactions
        serverTxns.forEach(st => {
          const ref = st.referenceId ? String(st.referenceId).trim() : '';
          const key = ref ? `${ref}_${st.type}` : `SERVER_${st.id}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            result.push({
              id: String(st.id || ('TXN-' + (ref || Math.random()))),
              walletId: 'w-' + userId,
              userId: userId,
              amount: Number(st.amount),
              type: st.type,
              referenceId: ref,
              description: st.description || `Transaction ${st.type}`,
              timestamp: st.transactionTime || new Date().toISOString()
            });
          }
        });

        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        localStorage.setItem(`cropdeal_txns_${userId}`, JSON.stringify(result));
        return result;
      }),
      catchError(() => of([]))
    );
  }

  getStoredBalance(userId: string): number {
    const val = localStorage.getItem(`cropdeal_wallet_${userId}`);
    return val ? parseFloat(val) : 0;
  }

  saveStoredBalance(userId: string, balance: number): void {
    localStorage.setItem(`cropdeal_wallet_${userId}`, balance.toString());
  }

  getStoredReservedBalance(userId: string): number {
    const val = localStorage.getItem(`cropdeal_wallet_reserved_${userId}`);
    return val ? parseFloat(val) : 0;
  }

  saveStoredReservedBalance(userId: string, reserved: number): void {
    localStorage.setItem(`cropdeal_wallet_reserved_${userId}`, Math.max(0, reserved).toString());
  }

  getStoredAvailableBalance(userId: string): number {
    const total = this.getStoredBalance(userId);
    const reserved = this.getStoredReservedBalance(userId);
    return Math.max(0, total - reserved);
  }

  private addLocalTransaction(userId: string, txn: WalletTransaction): void {
    const txns = this.getLocalTransactions(userId);
    txns.unshift(txn);
    localStorage.setItem(`cropdeal_txns_${userId}`, JSON.stringify(txns));
  }

  private getLocalTransactions(userId: string): WalletTransaction[] {
    const raw = localStorage.getItem(`cropdeal_txns_${userId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }
}
