import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, BehaviorSubject } from 'rxjs';
import { BidOffer, BiddingAuction } from '../models/bidding.model';
import { environment } from '../../../environments/environment';
import { resolveCropImage } from '../utils/crop-image.util';

@Injectable({
  providedIn: 'root'
})
export class BiddingService {
  private baseUrl = `${environment.apiUrl}/biddings`;
  private readonly STORAGE_KEY = 'cropdeal_bidding_auctions';
  private readonly DELETED_AUCTIONS_KEY = 'cropdeal_deleted_bidding_ids';

  private biddingsSubject = new BehaviorSubject<BiddingAuction[]>([]);
  public biddings$ = this.biddingsSubject.asObservable();

  constructor(private http: HttpClient) {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const filtered = arr.filter(a => !['AUCT-101', 'AUCT-102', 'AUCT-103', 'AUCT-104'].includes(String(a.id)));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
          }
        }
      } catch {}
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === this.STORAGE_KEY) {
          this.biddingsSubject.next(this.loadStoredAuctions());
        }
      });
    }
    this.biddingsSubject.next(this.loadStoredAuctions());
  }

  public getDeletedAuctionIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.DELETED_AUCTIONS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr.map(String));
      }
    } catch {}
    return new Set<string>();
  }

  public markAuctionAsDeleted(id: string): void {
    try {
      const deleted = this.getDeletedAuctionIds();
      deleted.add(String(id));
      localStorage.setItem(this.DELETED_AUCTIONS_KEY, JSON.stringify(Array.from(deleted)));
    } catch {}
  }

  public removeDeletedAuctionId(id: string): void {
    try {
      const deleted = this.getDeletedAuctionIds();
      deleted.delete(String(id));
      localStorage.setItem(this.DELETED_AUCTIONS_KEY, JSON.stringify(Array.from(deleted)));
    } catch {}
  }

  public normalizeEndTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (!str) return '';
    // If it has no timezone indicator (no 'Z' and no '+' or '-' offset), append 'Z' so it is parsed as UTC
    if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
      return str + 'Z';
    }
    return str;
  }

  public parseAuctionDate(dateStr: string | null | undefined): Date {
    if (!dateStr) return new Date();
    const normalized = this.normalizeEndTime(dateStr);
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? new Date(dateStr) : d;
  }

  private getDefaultAuctions(): BiddingAuction[] {
    return [];
  }

  public loadStoredAuctions(): BiddingAuction[] {
    const deleted = this.getDeletedAuctionIds();
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const now = Date.now();
          return parsed.filter(a =>
            !deleted.has(String(a.id)) &&
            a.status !== 'CLOSED' &&
            (a.status as string) !== 'AWARDED' &&
            (!a.endTime || this.parseAuctionDate(a.endTime).getTime() > now)
          );
        }
      } catch (e) {}
    }
    return [];
  }

  private saveStoredAuctions(auctions: BiddingAuction[]): void {
    const deleted = this.getDeletedAuctionIds();
    const valid = (auctions || []).filter(a => !deleted.has(String(a.id)) && a.status !== 'CLOSED' && (a.status as string) !== 'AWARDED');
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(valid));
    this.biddingsSubject.next(valid);
  }

  private resolveFarmerName(farmerId: any, fallbackName?: string): string {
    if (fallbackName && fallbackName !== 'null' && fallbackName.trim() !== '') {
      return fallbackName;
    }
    const fid = String(farmerId || '');
    try {
      const raw = localStorage.getItem('cropdeal_users_master');
      if (raw) {
        const list = JSON.parse(raw);
        const match = list.find((u: any) => String(u.id) === fid || String(u.userId) === fid);
        if (match && (match.fullName || match.name || match.username)) {
          return match.fullName || match.name || match.username;
        }
      }
    } catch {}
    try {
      const curr = localStorage.getItem('cropdeal_user');
      if (curr) {
        const u = JSON.parse(curr);
        if (String(u.id) === fid || String(u.userId) === fid) {
          return u.fullName || u.username || 'Farmer';
        }
      }
    } catch {}
    return 'Farmer #' + (fid || '1');
  }

  public resolveDealerName(dealerId: any, fallbackName?: string): string {
    if (fallbackName && fallbackName !== 'null' && fallbackName.trim() !== '') {
      return fallbackName;
    }
    const did = String(dealerId || '').trim();
    try {
      const raw = localStorage.getItem('cropdeal_users_master');
      if (raw) {
        const list = JSON.parse(raw);
        const match = list.find((u: any) =>
          (did && (String(u.id) === did || String(u.userId) === did)) ||
          (!did && u.role === 'DEALER')
        );
        if (match && (match.fullName || match.name || match.username)) {
          return match.fullName || match.name || match.username;
        }
      }
    } catch {}
    try {
      const curr = localStorage.getItem('cropdeal_user');
      if (curr) {
        const u = JSON.parse(curr);
        if (u.role === 'DEALER' || String(u.id) === did || String(u.userId) === did) {
          return u.fullName || u.username || 'Super Agros (Dealer)';
        }
      }
    } catch {}
    return (did && did !== 'null') ? (did === '2' || did === 'dealer-1' ? 'Super Agros (Dealer)' : `Dealer #${did}`) : 'Super Agros (Dealer)';
  }

  private normalizeImageUrl(url: string | null | undefined, cropName: string): string {
    if (!url) return resolveCropImage(cropName);
    if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/uploads/bidding/')) {
      return '/api/biddings/images/' + url.substring('/uploads/bidding/'.length);
    }
    if (url.startsWith('/api/biddings/images/')) {
      return url;
    }
    return resolveCropImage(cropName);
  }

  getAllAuctions(): Observable<BiddingAuction[]> {
    return this.getActiveAuctions();
  }

  getDealerBids(dealerId: string | number): Observable<any[]> {
    const cleanId = String(dealerId).replace(/\D/g, '') || '2';
    return this.http.get<any[]>(`${environment.apiUrl}/bids/dealer/${cleanId}`).pipe(
      catchError(() => {
        const local = this.loadStoredAuctions();
        const bids: any[] = [];
        local.forEach(a => {
          if (Array.isArray(a.bidsHistory)) {
            a.bidsHistory.forEach((b: any) => {
              if (String(b.dealerId) === String(dealerId) || String(b.dealerId) === cleanId) {
                bids.push(b);
              }
            });
          }
          if (Array.isArray((a as any).bids)) {
            (a as any).bids.forEach((b: any) => {
              if (String(b.dealerId) === String(dealerId) || String(b.dealerId) === cleanId) {
                bids.push(b);
              }
            });
          }
        });
        return of(bids);
      })
    );
  }

  getActiveAuctions(): Observable<BiddingAuction[]> {
    const deleted = this.getDeletedAuctionIds();
    return this.http.get<any[]>(this.baseUrl).pipe(
      catchError(() => of(this.loadStoredAuctions())),
      map(data => {
        const local = this.loadStoredAuctions();
        const mapById = new Map<string, BiddingAuction>();

        if (data && data.length > 0) {
          data.forEach(a => {
            const sid = String(a.id);
            if (!deleted.has(sid)) {
              // Find matching local item by ID only
              const matchedLocal = local.find(loc => String(loc.id) === sid);

              const starting = Number(a.basePrice || a.startingPrice || 20);
              const highest = a.highestBidAmount != null && Number(a.highestBidAmount) > 0
                ? Number(a.highestBidAmount)
                : (Number(a.currentHighestBid || matchedLocal?.currentHighestBid || starting));

              const serverBids = Array.isArray(a.bids) ? a.bids : [];
              const rawBidsCount = serverBids.length > 0 ? serverBids.length : Number(a.bidsCount || matchedLocal?.bidsCount || 0);

              const topBid = serverBids.length > 0 ? serverBids[0] : null;
              const hasBid = (highest > starting) || rawBidsCount > 0 || Boolean(a.winningDealerId) || Boolean(matchedLocal?.highestBidderName);
              const bidsCount = hasBid ? Math.max(1, rawBidsCount) : 0;

              const highestBidderId = a.winningDealerId ? String(a.winningDealerId) :
                (topBid?.dealerId ? String(topBid.dealerId) :
                (matchedLocal?.highestBidderId ? String(matchedLocal.highestBidderId) :
                (a.highestBidderId ? String(a.highestBidderId) : (hasBid ? '2' : null))));

              const rawDealerName = a.highestBidderName || matchedLocal?.highestBidderName || topBid?.dealerName || topBid?.bidderName;
              const highestBidderName = hasBid ? this.resolveDealerName(highestBidderId, rawDealerName) : null;

              const bidsHistory = serverBids.length > 0 ? serverBids.map((b: any) => ({
                dealerId: b.dealerId ? String(b.dealerId) : undefined,
                bidderName: this.resolveDealerName(b.dealerId, b.dealerName || b.bidderName),
                bidPriceKg: Number(b.bidAmount),
                bidTime: b.bidTime || 'Recent'
              })) : (matchedLocal?.bidsHistory && matchedLocal.bidsHistory.length > 0 ? matchedLocal.bidsHistory : (hasBid ? [{
                dealerId: highestBidderId || '2',
                bidderName: highestBidderName || 'Super Agros (Dealer)',
                bidPriceKg: highest,
                bidTime: 'Recent'
              }] : []));

              const farmerName = this.resolveFarmerName(a.farmerId, a.farmerName || matchedLocal?.farmerName);
              const image = (matchedLocal?.imageUrl && matchedLocal.imageUrl.startsWith('data:image/'))
                ? matchedLocal.imageUrl
                : this.normalizeImageUrl(a.photoUrl || a.imageUrl || matchedLocal?.imageUrl, a.cropName);
              const rawEndTime = a.endTime || matchedLocal?.endTime || new Date(Date.now() + 6 * 3600000).toISOString();
              const endTime = this.normalizeEndTime(rawEndTime);

              mapById.set(sid, {
                ...a,
                id: sid,
                cropName: a.cropName,
                variety: a.description || matchedLocal?.variety || 'Grade A Produce',
                farmerName: farmerName,
                highestBidderId: highestBidderId,
                highestBidderName: highestBidderName,
                bidsHistory: bidsHistory,
                imageUrl: image,
                photoUrl: image,
                startingPrice: starting,
                currentHighestBid: highest,
                bidsCount: bidsCount,
                location: a.location || matchedLocal?.location || 'Local Mandi APMC',
                endTime: endTime
              });
            }
          });

          // Only keep local auctions that do not match any server auction by ID
          local.forEach(loc => {
            const matchesServer = Array.from(mapById.values()).some(s => String(s.id) === String(loc.id));
            if (!matchesServer && !deleted.has(String(loc.id))) {
              mapById.set(String(loc.id), loc);
            }
          });
        } else {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
          this.biddingsSubject.next([]);
          return [];
        }

        const now = Date.now();
        const result = Array.from(mapById.values()).filter(a => {
          if (deleted.has(String(a.id))) return false;
          if (a.status && a.status !== 'OPEN') return false;
          if (a.endTime && this.parseAuctionDate(a.endTime).getTime() <= now) return false;
          return true;
        });

        // Sort newest first
        result.sort((a, b) => {
          const numA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
          return numB - numA;
        });

        // Save sanitized list back to storage
        this.saveStoredAuctions(result);
        return result;
      })
    );
  }

  getAuctionById(id: string): Observable<BiddingAuction> {
    const deleted = this.getDeletedAuctionIds();
    if (deleted.has(String(id))) return of({} as BiddingAuction);
    const local = this.loadStoredAuctions().find(a => String(a.id) === String(id));
    if (local) return of(local);
    return this.http.get<BiddingAuction>(`${this.baseUrl}/${id}`).pipe(
      catchError(() => of({} as BiddingAuction))
    );
  }

  uploadBiddingImage(file: File): Observable<{ imageUrl: string; photoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string; photoUrl: string }>(`${this.baseUrl}/upload-image`, formData);
  }

  createAuction(auction: Partial<BiddingAuction>): Observable<BiddingAuction> {
    const startingPrice = Number(auction.startingPrice || 20);
    const photoUrl = (auction as any).photoUrl || auction.imageUrl || '';
    const numFarmerId = parseInt(String(auction.farmerId || '4').replace(/\D/g, ''), 10) || 4;
    const durationHours = Number(auction.durationHours || 6);
    const rawEndTime = auction.endTime || new Date(Date.now() + durationHours * 3600000).toISOString();
    const endTime = this.normalizeEndTime(rawEndTime);

    const newAuction: BiddingAuction = {
      id: auction.id || ('AUCT-' + Date.now()),
      cropId: auction.cropId || 'crop-' + Date.now(),
      cropName: auction.cropName || 'Fresh Harvest Crop Lot',
      farmerId: String(numFarmerId),
      farmerName: auction.farmerName || this.resolveFarmerName(numFarmerId),
      startingPrice: startingPrice,
      currentHighestBid: Number(auction.currentHighestBid || startingPrice),
      highestBidderId: auction.highestBidderId,
      highestBidderName: auction.highestBidderName,
      quantity: Number(auction.quantity || 100),
      unit: auction.unit || 'Kg',
      endTime: endTime,
      durationHours: durationHours,
      status: 'OPEN',
      bidsCount: auction.bidsCount || 0,
      minIncrement: auction.minIncrement || 1,
      location: auction.location || 'Local Mandi APMC',
      variety: auction.variety || 'Grade A Produce',
      imageUrl: photoUrl,
      createdAt: new Date().toISOString(),
      bidsHistory: auction.bidsHistory || []
    };
    (newAuction as any).photoUrl = photoUrl;
    this.removeDeletedAuctionId(newAuction.id);

    const payload = {
      farmerId: numFarmerId,
      cropName: newAuction.cropName,
      quantity: newAuction.quantity,
      unit: newAuction.unit,
      basePrice: startingPrice,
      guidelinePrice: startingPrice,
      location: newAuction.location,
      description: newAuction.variety,
      endTime: endTime,
      durationHours: durationHours,
      photoUrl: photoUrl
    };

    return this.http.post<any>(this.baseUrl, payload).pipe(
      map(res => {
        if (res && res.id) {
          const sid = String(res.id);
          this.removeDeletedAuctionId(sid);
          newAuction.id = sid;
          newAuction.cropId = 'crop-' + sid;
          if (res.endTime) {
            newAuction.endTime = this.normalizeEndTime(res.endTime);
          }
          if (res.photoUrl) {
            const norm = this.normalizeImageUrl(res.photoUrl, res.cropName || newAuction.cropName);
            newAuction.imageUrl = norm;
            (newAuction as any).photoUrl = norm;
          }
        }
        const currentList = this.loadStoredAuctions().filter(x =>
          String(x.id) !== String(newAuction.id)
        );
        currentList.unshift(newAuction);
        this.saveStoredAuctions(currentList);
        return newAuction;
      }),
      catchError(() => {
        this.removeDeletedAuctionId(newAuction.id);
        const currentList = this.loadStoredAuctions().filter(x => String(x.id) !== String(newAuction.id));
        currentList.unshift(newAuction);
        this.saveStoredAuctions(currentList);
        return of(newAuction);
      })
    );
  }

  placeBid(bid: BidOffer): Observable<BiddingAuction> {
    const list = this.loadStoredAuctions();
    const index = list.findIndex(a => String(a.id) === String(bid.biddingId));
    if (index !== -1) {
      list[index].currentHighestBid = Number(bid.bidAmount);
      list[index].highestBidderId = bid.dealerId;
      list[index].highestBidderName = bid.dealerName;
      list[index].bidsCount = (list[index].bidsCount || 0) + 1;
      if (!list[index].bidsHistory) {
        list[index].bidsHistory = [];
      }
      list[index].bidsHistory!.unshift({
        dealerId: String(bid.dealerId),
        bidderName: bid.dealerName || 'Dealer',
        bidPriceKg: Number(bid.bidAmount),
        bidTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      });
      this.saveStoredAuctions(list);
    }

    let numericDealerId = Number(bid.dealerId);
    if (isNaN(numericDealerId) || numericDealerId <= 0) {
      numericDealerId = 2; // Default seeded Dealer ID
    }

    const payload = {
      dealerId: numericDealerId,
      bidAmount: Number(bid.bidAmount)
    };

    return this.http.post<any>(`${this.baseUrl}/${bid.biddingId}/bids`, payload).pipe(
      tap((res) => {
        if (res) {
          const updated = this.loadStoredAuctions();
          const idx = updated.findIndex(a => String(a.id) === String(bid.biddingId));
          if (idx !== -1) {
            updated[idx].currentHighestBid = Number(bid.bidAmount);
            updated[idx].bidsCount = (updated[idx].bidsCount || 0) + 1;
            this.saveStoredAuctions(updated);
          }
        }
      }),
      catchError(() => {
        return of(index !== -1 ? list[index] : ({} as BiddingAuction));
      }),
      map(() => index !== -1 ? list[index] : ({} as BiddingAuction))
    );
  }

  toggleBlockAuction(auctionId: string, block: boolean): Observable<BiddingAuction> {
    const list = this.loadStoredAuctions();
    const index = list.findIndex(a => String(a.id) === String(auctionId));
    let target = {} as BiddingAuction;
    if (index !== -1) {
      list[index].status = block ? 'BLOCKED' : 'OPEN';
      target = list[index];
      this.saveStoredAuctions(list);
    }
    this.http.put<BiddingAuction>(`${this.baseUrl}/${auctionId}/block?block=${block}`, {}).subscribe({
      next: () => {},
      error: () => {}
    });
    return of(target);
  }

  deleteAuction(auctionId: string): Observable<boolean> {
    this.markAuctionAsDeleted(auctionId);
    const list = this.loadStoredAuctions().filter(a => String(a.id) !== String(auctionId));
    this.saveStoredAuctions(list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cropdeal:bidding_deleted', { detail: { id: auctionId } }));
    }

    this.http.delete(`${this.baseUrl}/${auctionId}`).subscribe({
      next: () => {},
      error: () => {}
    });
    return of(true);
  }

  closeAuction(auctionId: string, orderId?: string, awardedAmount?: number): Observable<BiddingAuction> {
    // When completed, delete the old auction lot from active storage
    const list = this.loadStoredAuctions();
    const target = list.find(a => a.id === auctionId);
    const remaining = list.filter(a => a.id !== auctionId);
    this.saveStoredAuctions(remaining);

    this.http.post<BiddingAuction>(`${this.baseUrl}/${auctionId}/close`, {}).subscribe({
      next: () => {},
      error: () => {}
    });

    if (target) {
      target.status = 'CLOSED';
      target.awardedOrderId = orderId;
      target.awardedAmount = awardedAmount;
      return of(target);
    }
    return of({} as BiddingAuction);
  }
}
