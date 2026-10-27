import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { BiddingService } from '../../core/services/bidding.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { WalletService } from '../../core/services/wallet.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderService } from '../../core/services/order.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { PaymentService } from '../../core/services/payment.service';
import { CropService } from '../../core/services/crop.service';
import { User } from '../../core/models/user.model';
import { BiddingAuction, BidOffer } from '../../core/models/bidding.model';
import { Invoice } from '../../core/models/invoice.model';
import { resolveCropImage } from '../../core/utils/crop-image.util';

interface AuctionItem {
  id: string;
  cropName: string;
  variety: string;
  grade: string;
  image: string;
  location: string;
  district: string;
  state: string;
  startingPriceKg: number;
  currentBidKg: number;
  totalQuantityKg: number;
  farmerName: string;
  farmerPhone: string;
  farmerRating: number;
  farmerReviewsCount: number;
  farmerId: string;
  bidsCount: number;
  timeRemaining: string;
  isEndingSoon: boolean;
  status: 'OPEN' | 'CLOSED';
  isFavorite?: boolean;
  highestBidderId?: string | null;
  highestBidderName?: string | null;
  bidsHistory: Array<{ dealerId?: string; bidderName: string; bidPriceKg: number; bidTime: string }>;
  endTime?: string;
}

@Component({
  selector: 'app-bidding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bidding-page">
      <!-- Farmer "My Biddings" Hero Header (matches image18.png) -->
      <section class="my-biddings-banner shadow-sm" *ngIf="isMyBiddingsMode && user?.role === 'FARMER'">
        <div class="my-biddings-overlay">
          <div>
            <h1 class="my-biddings-title">My Biddings</h1>
            <p class="my-biddings-subtitle">Track your crop auctions, live incoming dealer bids, and award or close your bidding lots.</p>
          </div>
          <div class="d-flex gap-2 align-center">
            <a routerLink="/bidding" class="btn btn-outline-light">
              <i class="fa-solid fa-gavel"></i> View Live Floor
            </a>
            <button class="btn-create-auction" (click)="openCreateModal()">
              <i class="fa-solid fa-circle-plus"></i> Create New Bidding
            </button>
          </div>
        </div>
      </section>

      <!-- Panoramic Hero Header (matches image6.jpeg) -->
      <section class="bidding-hero shadow-sm" *ngIf="!isMyBiddingsMode || user?.role !== 'FARMER'">
        <div class="hero-overlay">
          <h1 class="hero-title">
            Live <span class="text-green-brand">Bidding</span>
          </h1>
          <p class="hero-desc">
            Bid directly from farmers and get the best farm fresh produce at competitive prices.
          </p>

          <!-- 3 Feature Pills (matches image6.jpeg) -->
          <div class="feature-pills-row">
            <div class="bidding-pill">
              <div class="pill-icon-circle bg-emerald-light">
                <i class="fa-solid fa-leaf text-emerald"></i>
              </div>
              <div class="pill-text-group">
                <strong>Direct from Farmers</strong>
                <span>Fresh & Quality Produce</span>
              </div>
            </div>

            <div class="bidding-pill">
              <div class="pill-icon-circle bg-green-light">
                <i class="fa-solid fa-shield-halved text-emerald"></i>
              </div>
              <div class="pill-text-group">
                <strong>Transparent Bidding</strong>
                <span>Fair and Secure</span>
              </div>
            </div>

            <div class="bidding-pill">
              <div class="pill-icon-circle bg-teal-light">
                <i class="fa-solid fa-truck text-emerald"></i>
              </div>
              <div class="pill-text-group">
                <strong>Better Prices</strong>
                <span>Save More</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Filter Row & Farmer Action (matches image6.jpeg & image18.png) -->
      <div class="card filter-bar-card">
        <div class="filters-row">
          <div class="filter-col">
            <label><i class="fa-solid fa-location-dot text-emerald"></i> State</label>
            <select [(ngModel)]="filterState" class="filter-dropdown">
              <option value="All">All States</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Punjab">Punjab</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>
          </div>

          <div class="filter-col">
            <label><i class="fa-solid fa-city text-emerald"></i> District</label>
            <select [(ngModel)]="filterDistrict" class="filter-dropdown">
              <option value="All">All Districts</option>
              <option value="Coimbatore">Coimbatore</option>
              <option value="Chennai">Chennai</option>
              <option value="Dindigul">Dindigul</option>
              <option value="Erode">Erode</option>
              <option value="Namakkal">Namakkal</option>
              <option value="Salem">Salem</option>
              <option value="Madurai">Madurai</option>
            </select>
          </div>

          <div class="filter-col">
            <label><i class="fa-solid fa-wheat-awn text-emerald"></i> Commodity</label>
            <select [(ngModel)]="filterCommodity" class="filter-dropdown">
              <option value="All">All Commodities</option>
              <option value="Paddy (Rice)">Paddy (Rice)</option>
              <option value="Tomato">Tomato</option>
              <option value="Onion">Onion</option>
              <option value="Potato">Potato</option>
              <option value="Groundnut">Groundnut</option>
              <option value="Maize">Maize</option>
              <option value="Red Chilli">Red Chilli</option>
              <option value="Green Chilli">Green Chilli</option>
            </select>
          </div>

          <div class="filter-col">
            <label><i class="fa-solid fa-arrow-down-wide-short text-emerald"></i> Sort By</label>
            <select [(ngModel)]="filterSort" class="filter-dropdown">
              <option value="ending">Ending Soon</option>
              <option value="highest">Highest Bid</option>
              <option value="lowest">Lowest Bid</option>
              <option value="quantity">Largest Quantity</option>
            </select>
          </div>

          <div class="filter-col search-col">
            <label>&nbsp;</label>
            <div class="search-input-wrap">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" [(ngModel)]="searchQuery" placeholder="Search crops, variety or farmer..." class="bidding-search-input" />
            </div>
          </div>

          <div class="filter-col btn-col">
            <label>&nbsp;</label>
            <button class="btn-filter-search">
              <i class="fa-solid fa-magnifying-glass"></i> Search
            </button>
          </div>
        </div>

        <div class="farmer-create-bar" *ngIf="user?.role === 'FARMER'">
          <button class="btn-create-auction" (click)="openCreateModal()">
            <i class="fa-solid fa-circle-plus"></i> Create New Bidding
          </button>
        </div>
      </div>

      <!-- Toast Message -->
      <div *ngIf="toastMsg" class="alert-toast shadow-md">
        <i class="fa-solid fa-circle-check"></i>
        <span>{{ toastMsg }}</span>
      </div>

      <!-- 8-Card Auction Grid (matches image6.jpeg) -->
      <div class="auctions-grid">
        <div *ngIf="pagedAuctions.length === 0" class="empty-auctions-card" style="grid-column: 1 / -1; padding: 3.5rem 1.5rem; text-align: center; border: 1px dashed var(--border-light); background: #f8fafc; border-radius: 12px; margin-top: 1rem;">
          <i class="fa-solid fa-gavel" style="font-size: 3rem; margin-bottom: 0.75rem; color: #94a3b8;"></i>
          <h3 style="margin: 0; color: #1e293b; font-weight: 800;">No Live Biddings Active</h3>
          <p style="margin: 0.5rem 0 0; color: #64748b; font-size: 0.9rem;">Farmer-hosted bidding floors will appear here dynamically as auctions are launched.</p>
        </div>

        <div *ngFor="let item of pagedAuctions" class="auction-card shadow-sm">
          <!-- Card Media Header with Countdown Timer & Badges -->
          <div class="card-media-wrap">
            <img [src]="item.image" [alt]="item.cropName" class="auction-thumb" (error)="onThumbError($event, item.cropName)" />

            <!-- Status Badge: Ending Soon or Live Bidding -->
            <span class="status-pill" [ngClass]="item.isEndingSoon ? 'pill-ending' : 'pill-live'">
              <span class="status-dot"></span>
              {{ item.isEndingSoon ? 'Ending Soon' : 'Live Bidding' }}
            </span>

            <!-- Timer Badge -->
            <span class="timer-badge">
              <i class="fa-regular fa-clock"></i> {{ item.timeRemaining }}
            </span>
          </div>

          <!-- Card Content Body -->
          <div class="auction-card-body">
            <div class="crop-header-line">
              <h3 class="crop-name">{{ item.cropName }}</h3>
              <span class="crop-variety">{{ item.variety }}</span>
            </div>

            <div class="location-line">
              <i class="fa-solid fa-location-dot"></i> {{ item.location }}
            </div>

            <!-- Stats Row: Farmer Fixed Price & Current Highest Bid -->
            <div class="bid-stats-box">
              <div class="stat-col">
                <span class="stat-lbl">Farmer Fixed Price</span>
                <span class="stat-val text-dark">₹{{ item.startingPriceKg | number:'1.2-2' }} <small>/ Kg</small></span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-col">
                <span class="stat-lbl">Current Highest Bid</span>
                <span class="stat-val text-emerald">
                  <ng-container *ngIf="item.bidsCount > 0">₹{{ item.currentBidKg | number:'1.2-2' }} <small>/ Kg</small></ng-container>
                  <ng-container *ngIf="item.bidsCount === 0"><small class="text-muted">Awaiting 1st Bid</small></ng-container>
                </span>
              </div>
            </div>

            <!-- Total Lot Quantity & Latest Bid Indicator -->
            <div class="lot-qty-row">
              <div class="lot-qty-pill">
                <i class="fa-solid fa-boxes-stacked text-emerald"></i>
                <span>Lot: <strong>{{ item.totalQuantityKg | number:'1.0-0' }} Kg</strong></span>
              </div>
              <div class="lot-qty-pill" *ngIf="item.bidsHistory && item.bidsHistory.length > 0">
                <i class="fa-solid fa-clock-rotate-left text-muted"></i>
                <span>Latest: <strong class="text-emerald">₹{{ item.bidsHistory[0].bidPriceKg | number:'1.2-2' }}/Kg</strong></span>
              </div>
            </div>

            <!-- Farmer Info & Bid Count Row -->
            <div class="farmer-row">
              <div class="farmer-ident">
                <div class="farmer-circle">
                  <i class="fa-regular fa-user"></i>
                </div>
                <div class="farmer-names">
                  <strong>{{ item.farmerName !== null && item.farmerName !== undefined ? item.farmerName : 'null' }}</strong>
                  <span>Farmer</span>
                </div>
              </div>
              <span class="bids-count-tag">{{ item.bidsCount }} Bids</span>
            </div>

            <!-- Action Button: Differentiates My Biddings mode vs General Live Bidding -->
            <div class="card-btn-wrap" *ngIf="isMyBiddingsMode && user?.role === 'FARMER'">
              <div class="my-bid-actions-row">
                <button *ngIf="item.status === 'OPEN'" class="btn-close-bid" (click)="closeBid(item)" title="Award crop lot to highest bidder and close auction">
                  <i class="fa-solid fa-circle-check"></i> Close Bid & Sell
                </button>
                <button *ngIf="item.status === 'OPEN'" class="btn-cancel-bid" (click)="cancelBid(item)" title="Cancel this bidding lot">
                  <i class="fa-solid fa-ban"></i> Cancel Bid
                </button>
                <span *ngIf="item.status !== 'OPEN'" class="sold-tag">
                  <i class="fa-solid fa-lock"></i> {{ item.status === 'CLOSED' ? 'Sold to ' + (item.bidsHistory.length > 0 ? item.bidsHistory[0].bidderName : 'Highest Bidder') : 'Cancelled Lot' }}
                </span>
                <button class="btn-view-bids" (click)="selectedAuction = item">
                  <i class="fa-regular fa-eye"></i> View Bids ({{ item.bidsCount }})
                </button>
              </div>
            </div>

            <div class="card-btn-wrap" *ngIf="user?.role === 'DEALER'">
              <button class="btn-place-bid" (click)="onPlaceBidClick(item)" [disabled]="item.status !== 'OPEN'">
                <i class="fa-solid fa-gavel"></i> {{ item.status === 'OPEN' ? 'Place Bid' : 'Auction Closed' }}
              </button>
            </div>
            <div class="card-btn-wrap" *ngIf="user && user.role !== 'DEALER'">
              <span class="badge badge-info" style="display: block; text-align: center; padding: 0.5rem; border-radius: 6px; font-weight: 700;">
                <i class="fa-solid fa-eye"></i> View Only (Dealer Floor)
              </span>
            </div>
            <div class="card-btn-wrap" *ngIf="!user">
              <button class="btn-place-bid" (click)="onPlaceBidClick(item)">
                <i class="fa-solid fa-arrow-right-to-bracket"></i> Login as Dealer to Bid
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div class="pagination-footer-row" *ngIf="totalPages > 1">
        <span class="summary-text">Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredAuctions.length) }} of {{ filteredAuctions.length }} live auctions</span>
        <div class="pages-list">
          <button class="page-step-btn" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)"><i class="fa-solid fa-angle-left"></i></button>
          <button *ngFor="let p of totalPagesArray" class="page-num-btn" [class.active]="p === currentPage" (click)="setPage(p)">{{ p }}</button>
          <button class="page-step-btn" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)"><i class="fa-solid fa-angle-right"></i></button>
        </div>
      </div>

      <!-- AUCTION DETAIL & BID SUBMISSION MODAL -->
      <div *ngIf="selectedAuction" class="modal-backdrop">
        <div class="modal-dialog-large shadow-2xl">
          <div class="modal-header-nav">
            <button class="back-link" (click)="selectedAuction = null">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Live Bidding Floor</span>
              <span class="bc-sep">/</span>
              <strong class="text-emerald">{{ selectedAuction.cropName }}</strong>
            </button>
            <div class="modal-header-actions">
              <span class="modal-lot-tag"><i class="fa-solid fa-barcode text-emerald"></i> Lot #{{ selectedAuction.id }}</span>
              <button class="close-x-btn" (click)="selectedAuction = null" title="Close Modal">&times;</button>
            </div>
          </div>

          <div class="modal-grid-2col">
            <!-- Left Side: Product info, Timer & Bid Form -->
            <div class="modal-left-col">
              <!-- Single Crop Image Hero Banner (No thumbnails!) -->
              <div class="crop-hero-banner">
                <img
                  [src]="selectedAuction.image"
                  [alt]="selectedAuction.cropName"
                  class="crop-hero-img"
                  (error)="onThumbError($event, selectedAuction.cropName)"
                />
                <div class="crop-hero-gradient"></div>
                <div class="crop-hero-badges-top">
                  <span class="hero-badge-live"><span class="pulse-dot"></span> Live Auction Lot</span>
                  <span class="hero-badge-grade"><i class="fa-solid fa-certificate"></i> {{ (selectedAuction.grade && selectedAuction.grade !== 'null') ? selectedAuction.grade : 'Grade A Certified' }}</span>
                </div>
                <div class="crop-hero-bottom-info">
                  <span class="hero-info-item"><i class="fa-solid fa-location-dot"></i> {{ (selectedAuction.location && selectedAuction.location !== 'null') ? selectedAuction.location : 'Mandi Yard' }}</span>
                  <span class="hero-info-item"><i class="fa-solid fa-seedling"></i> {{ (selectedAuction.variety && selectedAuction.variety !== 'null') ? selectedAuction.variety : 'Grade A' }}</span>
                </div>
              </div>

              <div class="product-header mt-3">
                <div class="title-pills-row">
                  <h2>{{ selectedAuction.cropName }}</h2>
                  <span class="pill-live"><span class="status-dot"></span> Bidding Active</span>
                  <span class="pill-ending" *ngIf="selectedAuction.isEndingSoon"><span class="status-dot"></span> Ending Soon</span>
                </div>
                <div class="specs-line">
                  <span>Variety: <strong>{{ (selectedAuction.variety && selectedAuction.variety !== 'null') ? selectedAuction.variety : 'Certified Harvest' }}</strong></span>
                  <span class="dot-sep">•</span>
                  <span>Total Harvest: <strong>{{ selectedAuction.totalQuantityKg | number:'1.0-0' }} Kg</strong></span>
                  <span class="dot-sep">•</span>
                  <span>State: <strong>{{ (selectedAuction.state && selectedAuction.state !== 'null') ? selectedAuction.state : 'Tamil Nadu' }}</strong></span>
                </div>
              </div>

              <!-- 4 Metrics Highlights -->
              <div class="metrics-4box mt-3">
                <div class="metric-box">
                  <span class="lbl"><i class="fa-solid fa-tag text-slate"></i> Farmer Base Rate</span>
                  <strong class="val text-dark">₹{{ selectedAuction.startingPriceKg | number:'1.2-2' }} <small>/ Kg</small></strong>
                </div>
                <div class="metric-box highlight-emerald">
                  <span class="lbl"><i class="fa-solid fa-crown text-amber"></i> Current Highest Bid</span>
                  <strong class="val text-emerald">
                    <ng-container *ngIf="selectedAuction.bidsCount > 0">₹{{ selectedAuction.currentBidKg | number:'1.2-2' }} <small>/ Kg</small></ng-container>
                    <ng-container *ngIf="selectedAuction.bidsCount === 0"><small class="text-muted">Awaiting 1st Bid</small></ng-container>
                  </strong>
                </div>
                <div class="metric-box">
                  <span class="lbl"><i class="fa-solid fa-boxes-stacked text-slate"></i> Full Lot Size</span>
                  <strong class="val">{{ selectedAuction.totalQuantityKg | number:'1.0-0' }} Kg</strong>
                </div>
                <div class="metric-box highlight-timer">
                  <span class="lbl"><i class="fa-regular fa-clock text-danger"></i> Time Left</span>
                  <strong class="val text-danger">{{ selectedAuction.timeRemaining }}</strong>
                </div>
              </div>

              <!-- Place Bid Form Box -->
              <div class="bid-submission-box mt-3">
                <div class="bid-box-title">
                  <div class="gavel-icon-wrap"><i class="fa-solid fa-gavel text-emerald"></i></div>
                  <div>
                    <h4>Place Your Live Floor Bid</h4>
                    <span class="subtext">Must be higher than highest bid (₹{{ selectedAuction.currentBidKg | number:'1.2-2' }}/Kg)</span>
                  </div>
                </div>

                <div class="bid-inputs-row mt-3">
                  <div class="input-cell">
                    <label>Your Bid Price (₹ / Kg) *</label>
                    <div class="input-prefix-wrap">
                      <span class="currency-prefix">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        [min]="selectedAuction.currentBidKg + 0.5"
                        [(ngModel)]="userBidPrice"
                        (ngModelChange)="onBidPriceChange()"
                        class="bid-num-input"
                        placeholder="0.00"
                      />
                      <span class="unit-suffix">/ Kg</span>
                    </div>
                  </div>

                  <div class="calc-cell">
                    <span class="calc-lbl"><i class="fa-solid fa-shield-halved text-emerald"></i> Total Escrow Commitment</span>
                    <strong class="calc-val text-emerald">₹{{ calculatedTotalAmount | number:'1.0-0' }}</strong>
                    <span class="calc-sub">({{ selectedAuction.totalQuantityKg }} Kg × ₹{{ userBidPrice || 0 }})</span>
                  </div>
                </div>

                <!-- Quick Incremental Bid Selectors -->
                <div class="quick-bid-chips-wrap mt-2">
                  <span class="quick-lbl"><i class="fa-solid fa-bolt text-amber"></i> Quick Raise:</span>
                  <div class="quick-btns-row">
                    <button type="button" class="btn-quick-bid" (click)="setQuickBid(1)">+ ₹1 (₹{{ (selectedAuction.currentBidKg + 1) | number:'1.2-2' }})</button>
                    <button type="button" class="btn-quick-bid" (click)="setQuickBid(2)">+ ₹2 (₹{{ (selectedAuction.currentBidKg + 2) | number:'1.2-2' }})</button>
                    <button type="button" class="btn-quick-bid" (click)="setQuickBid(5)">+ ₹5 (₹{{ (selectedAuction.currentBidKg + 5) | number:'1.2-2' }})</button>
                    <button type="button" class="btn-quick-bid" (click)="setQuickBid(10)">+ ₹10 (₹{{ (selectedAuction.currentBidKg + 10) | number:'1.2-2' }})</button>
                  </div>
                </div>

                <!-- Validation Alert Banner -->
                <div *ngIf="userBidPrice && userBidPrice <= selectedAuction.currentBidKg" class="alert alert-danger p-2 mt-2 text-xs">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  Your bid (₹{{ userBidPrice | number:'1.2-2' }}/Kg) must be strictly higher than the current highest bid of ₹{{ selectedAuction.currentBidKg | number:'1.2-2' }}/Kg.
                </div>

                <div class="quantity-locked-line mt-2">
                  <i class="fa-solid fa-lock text-emerald"></i>
                  <span>Full Harvest Commitment: <strong>{{ selectedAuction.totalQuantityKg }} Kg</strong></span>
                </div>

                <!-- Wallet Escrow Requirement Indicator -->
                <div class="wallet-escrow-box mt-3" [ngClass]="dealerAvailableBalance >= calculatedTotalAmount ? 'escrow-ok' : 'escrow-low'">
                  <div class="d-flex justify-content-between align-center">
                    <div>
                      <span class="text-xs text-muted d-block"><i class="fa-solid fa-wallet text-emerald"></i> Net Escrow Balance (Spendable)</span>
                      <strong class="text-base text-dark">₹{{ dealerAvailableBalance | number:'1.2-2' }}</strong>
                      <small class="text-muted d-block text-xs" *ngIf="dealerReservedBalance > 0">
                        (Available: ₹{{ dealerWalletBalance | number:'1.2-2' }} • ₹{{ dealerReservedBalance | number:'1.2-2' }} held in active bids)
                      </small>
                    </div>
                    <span class="badge" [ngClass]="dealerAvailableBalance >= calculatedTotalAmount ? 'badge-success' : 'badge-danger'">
                      {{ dealerAvailableBalance >= calculatedTotalAmount ? '✓ Balance Available' : '⚠️ Insufficient Funds' }}
                    </span>
                  </div>
                  <div class="escrow-rule-text mt-2 text-xs" *ngIf="dealerAvailableBalance < calculatedTotalAmount">
                    <i class="fa-solid fa-triangle-exclamation text-danger"></i>
                    Bidding requires unreserved wallet balance for the full lot (₹{{ calculatedTotalAmount | number:'1.0-0' }}). Your available balance is ₹{{ dealerAvailableBalance | number:'1.0-0' }}. Please top up your wallet or wait for other bids to release.
                  </div>
                  <div class="escrow-rule-text mt-2 text-xs text-emerald" *ngIf="dealerAvailableBalance >= calculatedTotalAmount">
                    <i class="fa-solid fa-shield-halved"></i>
                    ₹{{ calculatedTotalAmount | number:'1.0-0' }} will be safely reserved in escrow. Released immediately if outbid or cancelled. Transferred to farmer upon winning.
                  </div>
                </div>

                <button
                  class="btn-submit-auction-bid mt-3"
                  (click)="submitBidOnAuction()"
                  [disabled]="dealerAvailableBalance < calculatedTotalAmount || !isBidAmountValid() || user?.role !== 'DEALER'">
                  <i class="fa-solid fa-gavel"></i>
                  <ng-container *ngIf="!isBidAmountValid()">
                    <span *ngIf="selectedAuction.bidsCount === 0">Bid Must Be Equal to or Higher Than ₹{{ selectedAuction.startingPriceKg | number:'1.2-2' }}/Kg</span>
                    <span *ngIf="selectedAuction.bidsCount > 0">Bid Must Be Higher Than ₹{{ selectedAuction.currentBidKg | number:'1.2-2' }}/Kg</span>
                  </ng-container>
                  <ng-container *ngIf="isBidAmountValid() && dealerAvailableBalance < calculatedTotalAmount">
                    Insufficient Available Balance to Bid
                  </ng-container>
                  <ng-container *ngIf="isBidAmountValid() && dealerAvailableBalance >= calculatedTotalAmount">
                    Reserve ₹{{ calculatedTotalAmount | number:'1.0-0' }} & Place Bid (₹{{ userBidPrice | number:'1.2-2' }}/Kg)
                  </ng-container>
                </button>
              </div>
            </div>

            <!-- Right Side: Farmer Details, Auction Details, Live Bids -->
            <div class="modal-right-col">
              <!-- Farmer Details Card -->
              <div class="detail-card">
                <h4 class="card-sec-title"><i class="fa-solid fa-user-check text-emerald"></i> Farmer Details</h4>
                <div class="farmer-profile-row">
                  <div class="farmer-avatar-lg">
                    <i class="fa-solid fa-user"></i>
                  </div>
                  <div class="farmer-profile-info">
                    <div class="f-name-row">
                      <strong>{{ (selectedAuction.farmerName && selectedAuction.farmerName !== 'null') ? selectedAuction.farmerName : 'Farmer Producer' }}</strong>
                      <span class="verified-tag">✓ Verified Farmer</span>
                    </div>
                    <span class="f-sub">Producer • Verified Lot Owner</span>
                    <div class="rating-line">
                      ⭐ <strong>{{ selectedAuction.farmerRating || '4.8' }}</strong> ({{ selectedAuction.farmerReviewsCount || 12 }} reviews)
                    </div>
                  </div>
                </div>

                <div class="farmer-contact-list mt-2">
                  <div><i class="fa-solid fa-location-dot text-emerald"></i> {{ (selectedAuction.location && selectedAuction.location !== 'null') ? selectedAuction.location : 'Coimbatore, Tamil Nadu' }}</div>
                  <div><i class="fa-solid fa-phone text-emerald"></i> {{ (selectedAuction.farmerPhone && selectedAuction.farmerPhone !== 'null') ? selectedAuction.farmerPhone : '+91 98765 43210' }}</div>
                </div>
              </div>

              <!-- Auction Details Card -->
              <div class="detail-card mt-3">
                <h4 class="card-sec-title"><i class="fa-solid fa-file-contract text-emerald"></i> Auction Specifications</h4>
                <div class="details-kv-list">
                  <div class="kv-line"><span class="k">Auction Type</span><span class="v">Live Public Floor</span></div>
                  <div class="kv-line"><span class="k">Commodity</span><span class="v font-bold">{{ selectedAuction.cropName }}</span></div>
                  <div class="kv-line"><span class="k">Variety</span><span class="v">{{ (selectedAuction.variety && selectedAuction.variety !== 'null') ? selectedAuction.variety : 'Grade A Produce' }}</span></div>
                  <div class="kv-line"><span class="k">Quality Grade</span><span class="v">{{ (selectedAuction.grade && selectedAuction.grade !== 'null') ? selectedAuction.grade : 'A Grade' }}</span></div>
                  <div class="kv-line"><span class="k">Total Lot Quantity</span><span class="v font-bold text-emerald">{{ selectedAuction.totalQuantityKg | number:'1.0-0' }} Kg</span></div>
                  <div class="kv-line"><span class="k">Origin State</span><span class="v">{{ (selectedAuction.state && selectedAuction.state !== 'null') ? selectedAuction.state : 'Tamil Nadu' }}</span></div>
                </div>
              </div>

              <!-- Latest 5 Bids History Table -->
              <div class="detail-card mt-3">
                <div class="bids-history-header">
                  <h4 class="card-sec-title">
                    <i class="fa-solid fa-list-ol text-emerald"></i> Latest 5 Floor Bids
                  </h4>
                  <span class="badge-count">{{ selectedAuction.bidsHistory ? Math.min(5, selectedAuction.bidsHistory.length) : 0 }} of {{ selectedAuction.bidsCount || 0 }} Bids</span>
                </div>

                <div class="bids-table-wrap">
                  <table class="bids-table" *ngIf="selectedAuction.bidsHistory && selectedAuction.bidsHistory.length > 0">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Bidder Name</th>
                        <th>Bid Price (₹/Kg)</th>
                        <th>Bid Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let b of selectedAuction.bidsHistory.slice(0, 5); let i = index" [class.lead-bid]="i === 0">
                        <td>
                          <span *ngIf="i === 0" class="lead-badge"><i class="fa-solid fa-crown text-amber"></i> #1 Highest</span>
                          <span *ngIf="i > 0">#{{ i + 1 }}</span>
                        </td>
                        <td><strong>{{ b.bidderName }}</strong></td>
                        <td class="text-emerald font-bold">₹{{ b.bidPriceKg | number:'1.2-2' }}</td>
                        <td class="text-muted">{{ b.bidTime }}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div *ngIf="!selectedAuction.bidsHistory || selectedAuction.bidsHistory.length === 0" class="p-3 text-center text-muted" style="background: #f8fafc; border-radius: 8px;">
                    <i class="fa-solid fa-gavel text-emerald" style="font-size: 1.5rem; display: block; margin-bottom: 0.35rem;"></i>
                    <p style="margin: 0; font-size: 0.8rem;">No bids placed yet. Starting floor price is <strong>₹{{ selectedAuction.startingPriceKg | number:'1.2-2' }}/Kg</strong>. Place the first bid above!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create New Bidding Modal (Farmer Only) -->
      <div *ngIf="showCreateModal" class="modal-backdrop">
        <div class="modal-dialog-small shadow-xl">
          <div class="modal-header-simple">
            <h3><i class="fa-solid fa-gavel text-amber"></i> Create New Crop Auction</h3>
            <button class="close-x" (click)="showCreateModal = false">&times;</button>
          </div>
          <div class="modal-body-simple">
            <div class="form-group">
              <label>Crop / Commodity *</label>
              <input type="text" [(ngModel)]="newCropName" placeholder="e.g. Paddy (Rice)" class="form-input" />
            </div>
            <div class="form-group mt-2">
              <label>Quantity (Kg) *</label>
              <input type="number" [(ngModel)]="newQuantityKg" placeholder="5000" class="form-input" />
            </div>
            <div class="form-group mt-2">
              <label>Starting Floor Price (₹/Kg) *</label>
              <input type="number" [(ngModel)]="newStartingPriceKg" placeholder="22.00" class="form-input" />
            </div>

            <div class="form-group mt-2">
              <label><i class="fa-regular fa-clock text-emerald"></i> Auction Duration *</label>
              <select [(ngModel)]="auctionDurationHours" class="form-input">
                <option [value]="6">6 Hours</option>
                <option [value]="12">12 Hours (Half Day)</option>
                <option [value]="24">24 Hours (Full Day)</option>
                <option [value]="48">48 Hours (2 Days)</option>
              </select>
            </div>

            <!-- Image Upload from Device (Cloudinary) -->
            <div class="form-group mt-2">
              <label><i class="fa-solid fa-cloud-arrow-up text-emerald"></i> Lot Image (Device / Cloudinary)</label>
              <div class="image-upload-wrapper">
                <input
                  type="file"
                  id="biddingFileInput"
                  (change)="onBiddingFileSelected($event)"
                  accept="image/*"
                  style="display: none;" />
                <label for="biddingFileInput" class="btn-file-select" [class.uploading]="isUploadingBiddingImage">
                  <i class="fa-solid fa-cloud-arrow-up" *ngIf="!isUploadingBiddingImage"></i>
                  <i class="fa-solid fa-spinner fa-spin text-emerald" *ngIf="isUploadingBiddingImage"></i>
                  <span>{{ isUploadingBiddingImage ? 'Uploading to Cloudinary...' : (selectedBiddingFile ? 'Change (' + selectedBiddingFile.name + ')' : 'Choose Image from Machine') }}</span>
                </label>

                <!-- Cloudinary Preview Card -->
                <div *ngIf="newCropImage || selectedBiddingPreview" class="image-preview-card mt-2">
                  <img
                    [src]="newCropImage || selectedBiddingPreview"
                    alt="Auction preview"
                    class="produce-preview-thumb"
                    (error)="onThumbError($event, newCropName)" />
                  <div class="preview-info">
                    <span class="preview-title">{{ selectedBiddingFile ? selectedBiddingFile.name : (newCropName || 'Bidding Lot Produce') }}</span>
                    <span class="badge-cloud" *ngIf="cloudinaryBiddingUrl || (newCropImage && newCropImage.includes('cloudinary'))">
                      <i class="fa-solid fa-cloud-bolt text-emerald"></i> Hosted on Cloudinary
                    </span>
                    <span class="badge-ready" *ngIf="!cloudinaryBiddingUrl && (!newCropImage || !newCropImage.includes('cloudinary'))">
                      <i class="fa-solid fa-image text-primary"></i> Ready for Upload
                    </span>
                  </div>
                </div>

                <!-- URL text input option -->
                <div class="mt-2">
                  <input
                    type="url"
                    [(ngModel)]="newCropImage"
                    placeholder="Or paste Cloud/Web Image URL (optional)"
                    class="form-input text-xs" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer-simple">
            <button class="btn-cancel" (click)="showCreateModal = false">Cancel</button>
            <button class="btn-create-submit" (click)="createAuctionSubmit()">
              <i class="fa-solid fa-rocket"></i> Launch Bidding Floor
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bidding-page { display: flex; flex-direction: column; gap: 1.5rem; font-family: inherit; }

    /* My Biddings Banner */
    .my-biddings-banner {
      background: linear-gradient(135deg, #14532d 0%, #15803d 100%);
      border-radius: 1rem;
      color: white;
      padding: 2rem 2.5rem;
    }
    .my-biddings-overlay {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
    }
    .my-biddings-title { font-size: 2.2rem; font-weight: 900; margin: 0 0 0.35rem 0; color: white; }
    .my-biddings-subtitle { font-size: 0.95rem; color: #bbf7d0; margin: 0; }
    .btn-outline-light {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.7);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.85rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-outline-light:hover { background: rgba(255,255,255,0.15); }
    .my-bid-actions-row { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; }
    .btn-close-bid {
      background: #15803d;
      color: white;
      border: none;
      padding: 0.55rem 0.75rem;
      border-radius: 0.45rem;
      font-size: 0.825rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: 100%;
      transition: background 0.15s;
    }
    .btn-close-bid:hover { background: #166534; }
    .btn-cancel-bid {
      background: white;
      color: #dc2626;
      border: 1px solid #fca5a5;
      padding: 0.45rem 0.75rem;
      border-radius: 0.45rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: 100%;
    }
    .btn-cancel-bid:hover { background: #fee2e2; }
    .btn-view-bids {
      background: #f8fafc;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.45rem 0.75rem;
      border-radius: 0.45rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: 100%;
    }
    .btn-view-bids:hover { background: #e2e8f0; }
    .sold-tag {
      background: #f1f5f9;
      color: #166534;
      padding: 0.45rem 0.65rem;
      border-radius: 0.45rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-align: center;
      display: block;
      width: 100%;
      border: 1px solid #bbf7d0;
    }

    /* Hero Section */
    .bidding-hero {
      background: url('/assets/images/sunset-banner.jpg') center/cover no-repeat,
                  linear-gradient(135deg, #064e3b, #047857);
      border-radius: 1rem;
      overflow: hidden;
    }
    .hero-overlay {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.90) 55%, rgba(255, 255, 255, 0.4) 100%);
      padding: 2.25rem 2.5rem;
    }
    .hero-title { font-size: 2.35rem; font-weight: 900; color: #0f172a; margin: 0 0 0.5rem; }
    .text-green-brand { color: #15803d; }
    .hero-desc { font-size: 0.95rem; color: #334155; margin: 0 0 1.75rem; max-width: 620px; }

    .feature-pills-row { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .bidding-pill {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.75rem 1.15rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }
    .pill-icon-circle {
      width: 40px; height: 40px; border-radius: 0.5rem;
      display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
    }
    .bg-emerald-light { background: #dcfce7; }
    .bg-green-light { background: #d1fae5; }
    .bg-teal-light { background: #ccfbf1; }
    .text-emerald { color: #15803d; }
    .pill-text-group { display: flex; flex-direction: column; }
    .pill-text-group strong { font-size: 0.9rem; font-weight: 800; color: #0f172a; }
    .pill-text-group span { font-size: 0.72rem; color: #64748b; font-weight: 600; }

    /* Filter Bar Card */
    .filter-bar-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
    }
    .filters-row {
      display: flex;
      gap: 0.85rem;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .filter-col { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 140px; }
    .filter-col label { font-size: 0.78rem; font-weight: 700; color: #334155; }
    .filter-dropdown {
      padding: 0.55rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      color: #1e293b;
      outline: none;
      background: white;
    }
    .search-col { flex: 2; min-width: 220px; }
    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input-wrap i {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .bidding-search-input {
      width: 100%;
      padding: 0.55rem 0.85rem 0.55rem 2.25rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      outline: none;
    }
    .btn-col { flex: 0 0 auto; min-width: auto; }
    .btn-filter-search {
      background: #15803d;
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .farmer-create-bar {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
    }
    .btn-create-auction {
      background: #15803d;
      color: white;
      border: none;
      padding: 0.55rem 1.15rem;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    /* 8-Card Grid */
    .auctions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
    }
    .auction-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .auction-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.08);
    }
    .card-media-wrap {
      position: relative;
      height: 140px;
      background: #e2e8f0;
    }
    .auction-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .status-pill {
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: white;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: white; }
    .pill-ending { background: #dc2626; }
    .pill-live { background: #16a34a; }
    .timer-badge {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(15, 23, 42, 0.8);
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 0.3rem;
      letter-spacing: 0.03em;
    }

    .auction-card-body {
      padding: 0.85rem 1rem 1rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .crop-header-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.2rem;
    }
    .crop-name { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; }
    .crop-variety { font-size: 0.75rem; color: #64748b; font-weight: 600; }
    .location-line { font-size: 0.75rem; color: #64748b; margin-bottom: 0.65rem; }

    .bid-stats-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.6rem 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .stat-col { display: flex; flex-direction: column; }
    .stat-lbl { font-size: 0.68rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .stat-val { font-size: 0.95rem; font-weight: 800; }
    .stat-val small { font-size: 0.7rem; color: #64748b; }
    .stat-divider { width: 1px; height: 26px; background: #e2e8f0; }

    .farmer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }
    .farmer-ident { display: flex; align-items: center; gap: 0.45rem; }
    .farmer-circle {
      width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0;
      display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #64748b;
    }
    .farmer-names { display: flex; flex-direction: column; }
    .farmer-names strong { font-size: 0.78rem; color: #0f172a; line-height: 1.1; }
    .farmer-names span { font-size: 0.65rem; color: #64748b; }
    .bids-count-tag { font-size: 0.75rem; color: #475569; font-weight: 600; }

    .btn-place-bid {
      width: 100%;
      background: #15803d;
      color: white;
      border: none;
      padding: 0.55rem;
      border-radius: 0.4rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      transition: background 0.2s;
    }
    .btn-place-bid:hover { background: #166534; }

    /* Pagination Footer */
    .pagination-footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .summary-text { font-size: 0.85rem; color: #64748b; }
    .pages-list { display: flex; align-items: center; gap: 0.35rem; }
    .page-step-btn, .page-num-btn {
      width: 34px; height: 34px; border-radius: 0.35rem;
      border: 1px solid #cbd5e1; background: white; font-size: 0.8rem;
      font-weight: 600; color: #475569; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .page-num-btn.active { background: #15803d; border-color: #15803d; color: white; }
    .dots { padding: 0 0.25rem; color: #94a3b8; }

    /* Modal Backdrop & Large Dialog */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
    }
    .modal-dialog-large {
      background: #ffffff; border-radius: 1.25rem; width: 100%;
      max-width: 1080px; max-height: 92vh; overflow-y: auto; padding: 1.75rem 2rem;
      box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.35);
      border: 1px solid rgba(226, 232, 240, 0.9);
    }
    .modal-header-nav {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 1.1rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1.5rem;
    }
    .back-link {
      background: none; border: none; font-size: 0.95rem; color: #475569;
      cursor: pointer; display: flex; align-items: center; gap: 0.6rem;
      transition: color 0.2s;
    }
    .back-link:hover { color: #15803d; }
    .bc-sep { color: #cbd5e1; }
    .modal-header-actions { display: flex; align-items: center; gap: 0.75rem; }
    .modal-lot-tag {
      font-size: 0.75rem; font-weight: 700; color: #166534; background: #dcfce7;
      padding: 0.25rem 0.65rem; border-radius: 9999px; border: 1px solid #bbf7d0;
      display: inline-flex; align-items: center; gap: 0.35rem;
    }
    .close-x-btn {
      width: 34px; height: 34px; border-radius: 50%; background: #f1f5f9;
      border: 1px solid #e2e8f0; font-size: 1.25rem; color: #64748b; cursor: pointer;
      display: flex; align-items: center; justify-content: center; line-height: 1;
      transition: all 0.2s;
    }
    .close-x-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

    .modal-grid-2col { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 2rem; }

    /* Single Crop Hero Banner */
    .crop-hero-banner {
      position: relative; width: 100%; height: 260px; border-radius: 1rem;
      overflow: hidden; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0; background: #0f172a;
    }
    .crop-hero-img {
      width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;
    }
    .crop-hero-banner:hover .crop-hero-img { transform: scale(1.03); }
    .crop-hero-gradient {
      position: absolute; bottom: 0; left: 0; right: 0; height: 110px;
      background: linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.4) 50%, transparent 100%);
      pointer-events: none;
    }
    .crop-hero-badges-top {
      position: absolute; top: 0.85rem; left: 0.85rem; right: 0.85rem;
      display: flex; justify-content: space-between; align-items: center; z-index: 2; pointer-events: none;
    }
    .hero-badge-live {
      background: rgba(22, 101, 52, 0.9); backdrop-filter: blur(4px);
      color: #ffffff; font-size: 0.72rem; font-weight: 700; padding: 0.3rem 0.65rem;
      border-radius: 9999px; display: inline-flex; align-items: center; gap: 0.4rem;
      border: 1px solid rgba(134, 239, 172, 0.4); box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #4ade80;
      display: inline-block; animation: pulseGlow 1.8s infinite;
    }
    @keyframes pulseGlow {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 7px rgba(74, 222, 128, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
    .hero-badge-grade {
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);
      color: #f8fafc; font-size: 0.72rem; font-weight: 700; padding: 0.3rem 0.65rem;
      border-radius: 9999px; display: inline-flex; align-items: center; gap: 0.35rem;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .crop-hero-bottom-info {
      position: absolute; bottom: 0.85rem; left: 0.85rem; right: 0.85rem;
      display: flex; justify-content: space-between; align-items: center;
      color: white; font-size: 0.8rem; font-weight: 600; z-index: 2;
      text-shadow: 0 1px 3px rgba(0,0,0,0.6); pointer-events: none;
    }
    .hero-info-item { display: inline-flex; align-items: center; gap: 0.35rem; }

    .title-pills-row { display: flex; align-items: center; gap: 0.65rem; }
    .title-pills-row h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
    .specs-line { font-size: 0.82rem; color: #64748b; margin-top: 0.35rem; }
    .dot-sep { margin: 0 0.35rem; color: #cbd5e1; }

    /* 4-Box Metrics */
    .metrics-4box {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;
    }
    .metric-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem;
      padding: 0.85rem 0.75rem; display: flex; flex-direction: column; gap: 0.35rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .metric-box.highlight-emerald { background: #f0fdf4; border-color: #86efac; }
    .metric-box.highlight-timer { background: #fef2f2; border-color: #fecaca; }
    .metric-box .lbl {
      font-size: 0.68rem; color: #64748b; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.03em; display: flex; align-items: center; gap: 0.35rem;
    }
    .metric-box .val { font-size: 1.25rem; font-weight: 800; line-height: 1.2; }

    /* Place Bid Form Box */
    .bid-submission-box {
      background: #ffffff; border: 1.5px solid #86efac; border-radius: 1rem;
      padding: 1.35rem; box-shadow: 0 4px 16px rgba(22, 101, 52, 0.06);
    }
    .bid-box-title { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; }
    .gavel-icon-wrap {
      width: 36px; height: 36px; border-radius: 50%; background: #dcfce7;
      display: flex; align-items: center; justify-content: center; font-size: 1rem;
      color: #166534; flex-shrink: 0;
    }
    .bid-box-title h4 { font-size: 1.1rem; font-weight: 800; color: #166534; margin: 0; }
    .bid-box-title .subtext { font-size: 0.76rem; color: #15803d; margin: 0; }

    .bid-inputs-row { display: grid; grid-template-columns: 1fr 1.3fr; gap: 1rem; align-items: center; }
    .input-cell { display: flex; flex-direction: column; gap: 0.35rem; }
    .input-cell label { font-size: 0.75rem; font-weight: 700; color: #166534; }
    .input-prefix-wrap { position: relative; display: flex; align-items: center; }
    .currency-prefix {
      position: absolute; left: 0.75rem; font-size: 1.1rem; font-weight: 800;
      color: #166534; pointer-events: none;
    }
    .unit-suffix {
      position: absolute; right: 0.75rem; font-size: 0.75rem; font-weight: 700;
      color: #64748b; pointer-events: none; background: #f1f5f9; padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .bid-num-input {
      width: 100%; padding: 0.7rem 3.5rem 0.7rem 1.85rem; border: 1.5px solid #16a34a;
      border-radius: 0.5rem; font-size: 1.2rem; font-weight: 800; color: #0f172a;
      outline: none; background: white; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .bid-num-input:focus {
      border-color: #15803d; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
    }
    .calc-cell {
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.65rem;
      padding: 0.75rem 1rem; display: flex; flex-direction: column; justify-content: center;
    }
    .calc-lbl {
      font-size: 0.7rem; color: #475569; font-weight: 700; text-transform: uppercase;
      display: flex; align-items: center; gap: 0.35rem;
    }
    .calc-val { font-size: 1.45rem; font-weight: 900; line-height: 1.2; }
    .calc-sub { font-size: 0.72rem; color: #64748b; margin-top: 0.15rem; }

    .quick-bid-chips-wrap {
      display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; margin-top: 0.75rem;
    }
    .quick-lbl { font-size: 0.75rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 0.35rem; }
    .quick-btns-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .btn-quick-bid {
      background: #ffffff; border: 1px solid #86efac; color: #166534; font-size: 0.75rem;
      font-weight: 700; padding: 0.35rem 0.65rem; border-radius: 9999px; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-quick-bid:hover {
      background: #15803d; color: #ffffff; border-color: #15803d; transform: translateY(-1px);
    }

    .quantity-locked-line {
      font-size: 0.8rem; color: #166534; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;
    }

    .wallet-escrow-box { border-radius: 0.75rem; padding: 0.95rem 1.15rem; border: 1.5px solid; }
    .wallet-escrow-box.escrow-ok { background: #f0fdf4; border-color: #bbf7d0; }
    .wallet-escrow-box.escrow-low { background: #fef2f2; border-color: #fecaca; }
    .escrow-rule-text { line-height: 1.4; display: flex; align-items: flex-start; gap: 0.4rem; }

    .btn-submit-auction-bid {
      width: 100%; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      color: white; border: none; padding: 0.85rem; border-radius: 0.65rem;
      font-size: 1.05rem; font-weight: 800; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      box-shadow: 0 4px 14px rgba(21, 128, 61, 0.3); transition: all 0.2s;
    }
    .btn-submit-auction-bid:hover:not(:disabled) {
      background: linear-gradient(135deg, #15803d 0%, #166534 100%);
      box-shadow: 0 6px 18px rgba(21, 128, 61, 0.4); transform: translateY(-1px);
    }
    .btn-submit-auction-bid:disabled {
      background: #94a3b8; box-shadow: none; cursor: not-allowed; opacity: 0.7;
    }

    /* Right Details Cards */
    .detail-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.85rem;
      padding: 1.15rem 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }
    .card-sec-title {
      font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 0.85rem;
      display: flex; align-items: center; gap: 0.45rem;
    }
    .farmer-profile-row { display: flex; align-items: center; gap: 0.85rem; }
    .farmer-avatar-lg {
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      display: flex; align-items: center; justify-content: center; font-size: 1.25rem;
      color: #15803d; border: 2px solid #86efac; flex-shrink: 0;
    }
    .farmer-profile-info { display: flex; flex-direction: column; }
    .f-name-row { display: flex; align-items: center; gap: 0.5rem; }
    .verified-tag {
      font-size: 0.68rem; color: #15803d; font-weight: 700; background: #dcfce7;
      padding: 0.15rem 0.45rem; border-radius: 9999px; border: 1px solid #86efac;
    }
    .f-sub { font-size: 0.72rem; color: #64748b; }
    .rating-line { font-size: 0.78rem; color: #0f172a; margin-top: 0.15rem; }
    .farmer-contact-list { font-size: 0.8rem; color: #475569; display: flex; flex-direction: column; gap: 0.35rem; }

    .details-kv-list { display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.82rem; }
    .kv-line { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px dashed #f1f5f9; }
    .kv-line:last-child { border-bottom: none; }
    .kv-line .k { color: #64748b; }
    .kv-line .v { font-weight: 700; color: #0f172a; }

    .bids-history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; }
    .badge-count { font-size: 0.7rem; font-weight: 700; color: #15803d; background: #dcfce7; padding: 0.15rem 0.5rem; border-radius: 9999px; }
    .bids-table-wrap { max-height: 190px; overflow-y: auto; }
    .bids-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.8rem; text-align: left; }
    .bids-table th { padding: 0.5rem 0.65rem; color: #64748b; font-weight: 700; border-bottom: 1.5px solid #e2e8f0; font-size: 0.72rem; text-transform: uppercase; }
    .bids-table td { padding: 0.55rem 0.65rem; border-bottom: 1px solid #f1f5f9; }
    .bids-table tr.lead-bid { background: #f0fdf4; font-weight: 700; }
    .lead-badge {
      display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.7rem;
      font-weight: 800; color: #166534; background: #dcfce7; padding: 0.15rem 0.4rem;
      border-radius: 4px; border: 1px solid #86efac;
    }

    /* Small Modal Dialog */
    .modal-dialog-small {
      background: white; border-radius: 0.75rem; width: 100%; max-width: 440px; overflow: hidden;
    }
    .modal-header-simple {
      padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header-simple h3 { font-size: 1.15rem; font-weight: 800; margin: 0; }
    .modal-body-simple { padding: 1.5rem; }
    .form-group label { font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; display: block; }
    .form-input { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.4rem; font-size: 0.85rem; outline: none; }
    .modal-footer-simple {
      padding: 1rem 1.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem;
    }
    .btn-cancel { background: white; border: 1px solid #cbd5e1; padding: 0.45rem 0.85rem; border-radius: 0.35rem; font-weight: 600; cursor: pointer; }
    .btn-create-submit { background: #15803d; color: white; border: none; padding: 0.45rem 1rem; border-radius: 0.35rem; font-weight: 700; cursor: pointer; }

    .alert-toast { background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 0.75rem 1.25rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.85rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.75rem; }
    .wallet-escrow-box { border-radius: 8px; padding: 0.85rem 1rem; }
    .wallet-escrow-box.escrow-ok { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .wallet-escrow-box.escrow-low { background: #fef2f2; border: 1px solid #fecaca; }
    .escrow-rule-text { line-height: 1.4; display: flex; align-items: flex-start; gap: 0.35rem; }
    .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

    /* Cloudinary Image Upload Styling */
    .image-upload-wrapper { margin-top: 0.25rem; }
    .btn-file-select {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1.1rem;
      background: #f0fdf4;
      border: 1.5px dashed #16a34a;
      border-radius: 0.5rem;
      color: #15803d;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      justify-content: center;
    }
    .btn-file-select:hover {
      background: #dcfce7;
      border-color: #15803d;
    }
    .btn-file-select.uploading {
      background: #f8fafc;
      border-color: #cbd5e1;
      cursor: wait;
    }
    .image-preview-card {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.6rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
    }
    .produce-preview-thumb {
      width: 58px;
      height: 58px;
      object-fit: cover;
      border-radius: 0.4rem;
      border: 1px solid #cbd5e1;
    }
    .preview-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow: hidden;
    }
    .preview-title {
      font-weight: 600;
      font-size: 0.825rem;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge-cloud {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.725rem;
      color: #15803d;
      background: #dcfce7;
      padding: 0.15rem 0.45rem;
      border-radius: 0.3rem;
      font-weight: 600;
      width: fit-content;
    }
    .badge-ready {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.725rem;
      color: #2563eb;
      background: #dbeafe;
      padding: 0.15rem 0.45rem;
      border-radius: 0.3rem;
      font-weight: 600;
      width: fit-content;
    }

    /* Omni-Device Adaptive Layout Breakpoints */
    @media (min-width: 2560px) {
      .auctions-grid { grid-template-columns: repeat(6, 1fr) !important; gap: 1.75rem !important; }
    }
    @media (min-width: 1920px) and (max-width: 2559px) {
      .auctions-grid { grid-template-columns: repeat(5, 1fr) !important; gap: 1.5rem !important; }
    }
    @media (max-width: 1024px) {
      .auctions-grid { grid-template-columns: repeat(3, 1fr); }
      .modal-grid-2col { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .auctions-grid { grid-template-columns: repeat(2, 1fr); }
      .filters-row { flex-direction: column; }
    }
    @media (max-width: 480px) {
      .auctions-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BiddingComponent implements OnInit, OnDestroy {
  resolveCropImage = resolveCropImage;
  user: User | null = null;
  toastMsg = '';
  currentPage = 1;

  // Filters
  filterState = 'All';
  filterDistrict = 'All';
  filterCommodity = 'All';
  filterSort = 'ending';
  searchQuery = '';

  // Modal State
  selectedAuction: AuctionItem | null = null;
  userBidPrice = 23.00;
  calculatedTotalAmount = 115000;
  dealerWalletBalance = 0;
  dealerReservedBalance = 0;
  dealerAvailableBalance = 0;

  // Create Auction
  showCreateModal = false;
  newCropName = '';
  newQuantityKg = 5000;
  newStartingPriceKg = 20.00;
  newCropImage: string = '';
  selectedBiddingFile: File | null = null;
  selectedBiddingPreview: string | null = null;
  isUploadingBiddingImage = false;
  cloudinaryBiddingUrl: string | null = null;
  auctionDurationHours = 6;

  // Dynamic auctions list
  auctions: AuctionItem[] = [];

  isMyBiddingsMode = false;
  private timerInterval: any = null;

  constructor(
    private biddingService: BiddingService,
    private authService: AuthService,
    private authModalService: AuthModalService,
    private walletService: WalletService,
    private notificationService: NotificationService,
    private orderService: OrderService,
    private invoiceService: InvoiceService,
    private deliveryService: DeliveryService,
    private paymentService: PaymentService,
    private cropService: CropService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.user = u;
      if (u) {
        const uid = String(u.id || u.userId || 'dealer-1');
        this.walletService.getWallet(uid).subscribe(w => {
          this.dealerWalletBalance = w.balance;
          this.dealerReservedBalance = w.reservedBalance || 0;
          this.dealerAvailableBalance = w.availableBalance || 0;
        });
        this.dealerWalletBalance = this.walletService.getStoredBalance(uid);
        this.dealerReservedBalance = this.walletService.getStoredReservedBalance(uid);
        this.dealerAvailableBalance = this.walletService.getStoredAvailableBalance(uid);
      } else {
        this.dealerWalletBalance = 0;
        this.dealerReservedBalance = 0;
        this.dealerAvailableBalance = 0;
      }
    });

    this.walletService.wallet$.subscribe(w => {
      this.dealerWalletBalance = w.balance;
      this.dealerReservedBalance = w.reservedBalance || 0;
      this.dealerAvailableBalance = w.availableBalance || 0;
    });

    this.walletService.balance$.subscribe(b => {
      this.dealerWalletBalance = b;
      this.dealerAvailableBalance = Math.max(0, b - this.dealerReservedBalance);
    });

    this.route.queryParams.subscribe(params => {
      this.isMyBiddingsMode = params['mode'] === 'my';
    });

    this.biddingService.biddings$.subscribe((bList) => {
      const deletedIds = this.biddingService.getDeletedAuctionIds();
      this.auctions = (bList || [])
        .filter(a => !deletedIds.has(String(a.id)) && (a.status === 'OPEN' || !a.status))
        .map(sa => this.mapServerAuctionToItem(sa));
      this.deduplicateAuctions();
      this.updateCountdowns();
    });

    this.loadAuctions();

    this.timerInterval = setInterval(() => {
      this.updateCountdowns();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadAuctions(): void {
    this.biddingService.getActiveAuctions().subscribe({
      next: (serverAuctions) => {
        const deletedIds = this.biddingService.getDeletedAuctionIds();
        if (serverAuctions && serverAuctions.length > 0) {
          this.auctions = serverAuctions
            .filter(a => !deletedIds.has(String(a.id)) && (a.status === 'OPEN' || !a.status))
            .map(sa => this.mapServerAuctionToItem(sa));
          this.deduplicateAuctions();
        } else {
          this.auctions = [];
        }
        this.updateCountdowns();
      },
      error: () => {
        this.auctions = [];
      }
    });
  }

  private deduplicateAuctions(): void {
    const seen = new Set<string>();
    const deduplicated: AuctionItem[] = [];
    for (const a of this.auctions) {
      const idKey = String(a.id);
      if (!seen.has(idKey)) {
        seen.add(idKey);
        deduplicated.push(a);
      }
    }
    this.auctions = deduplicated;
  }

  private updateCountdowns(): void {
    const now = Date.now();
    this.auctions.forEach(item => {
      if (item.endTime) {
        const end = this.biddingService.parseAuctionDate(item.endTime).getTime();
        const diff = end - now;
        if (diff <= 0) {
          item.status = 'CLOSED';
          item.timeRemaining = '00 : 00 : 00';
          item.isEndingSoon = true;
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          const pad = (n: number) => n.toString().padStart(2, '0');
          item.timeRemaining = `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
          item.isEndingSoon = diff < 3600000;
        }
      }
    });
  }

  private mapServerAuctionToItem(sa: any): AuctionItem {
    const startingPrice = Number(sa.startingPrice || sa.startingBid || sa.basePrice || 20);
    const highestServerBid = sa.highestBidAmount != null ? Number(sa.highestBidAmount) : null;
    const currentBid = (highestServerBid && highestServerBid > 0) ? highestServerBid : Number(sa.currentHighestBid || sa.currentBid || startingPrice);
    const durationHours = Number(sa.durationHours || 6);
    const rawEndTime = sa.endTime || new Date(Date.now() + durationHours * 3600000).toISOString();
    const endTime = this.biddingService.normalizeEndTime(rawEndTime);
    const serverBids = Array.isArray(sa.bids) ? sa.bids : [];
    const count = serverBids.length > 0 ? serverBids.length : (sa.bidsCount || sa.totalBids || 0);

    const now = Date.now();
    const end = this.biddingService.parseAuctionDate(endTime).getTime();
    const diff = Math.max(0, end - now);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const initialTimeRemaining = `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;

    let rawImage = sa.photoUrl || sa.imageUrl;
    if (rawImage && rawImage.startsWith('/uploads/')) {
      rawImage = '/api/biddings/images/' + rawImage.substring(rawImage.lastIndexOf('/') + 1);
    }
    const finalImage = rawImage || resolveCropImage(sa.cropName);

    let farmerName = sa.farmerName;
    if (!farmerName || farmerName === 'null' || farmerName.trim() === '') {
      if (this.user && (String(sa.farmerId) === String(this.user.id) || String(sa.farmerId) === String(this.user.userId))) {
        farmerName = this.user.fullName || this.user.username;
      }
      if (!farmerName || farmerName === 'null') {
        try {
          const raw = localStorage.getItem('cropdeal_users_master');
          if (raw) {
            const list = JSON.parse(raw);
            const match = list.find((u: any) => String(u.id) === String(sa.farmerId) || String(u.userId) === String(sa.farmerId));
            if (match) farmerName = match.fullName || match.name || match.username;
          }
        } catch {}
      }
      if (!farmerName || farmerName === 'null') {
        try {
          const curr = localStorage.getItem('cropdeal_user');
          if (curr) {
            const u = JSON.parse(curr);
            if (String(u.id) === String(sa.farmerId) || String(u.userId) === String(sa.farmerId)) {
              farmerName = u.fullName || u.username;
            }
          }
        } catch {}
      }
      if (!farmerName || farmerName === 'null') {
        farmerName = 'Farmer #' + (sa.farmerId || '1');
      }
    }

    return {
      id: String(sa.id),
      cropName: sa.cropName || 'Fresh Harvest Crop',
      variety: sa.variety || sa.description || 'Grade A Produce',
      grade: sa.grade || 'A Grade',
      image: finalImage,
      location: sa.location || 'Local Mandi APMC',
      district: sa.district || 'Coimbatore',
      state: sa.state || 'Tamil Nadu',
      startingPriceKg: startingPrice,
      currentBidKg: currentBid,
      totalQuantityKg: Number(sa.quantity || 1000),
      farmerName: farmerName,
      farmerPhone: sa.farmerPhone || '+91 98140 11223',
      farmerRating: 4.8,
      farmerReviewsCount: 15,
      farmerId: String(sa.farmerId || '1'),
      bidsCount: count,
      timeRemaining: initialTimeRemaining,
      isEndingSoon: diff < 3600000,
      status: (sa.status as any) || 'OPEN',
      endTime: endTime,
      bidsHistory: serverBids.length > 0 ? serverBids.map((b: any) => ({
        dealerId: b.dealerId ? String(b.dealerId) : undefined,
        bidderName: this.biddingService.resolveDealerName(b.dealerId, b.dealerName || b.bidderName),
        bidPriceKg: Number(b.bidAmount),
        bidTime: b.bidTime || 'Recent'
      })) : (sa.bidsHistory && sa.bidsHistory.length > 0 ? sa.bidsHistory : ((currentBid > startingPrice || count > 0) ? [{
        dealerId: '2',
        bidderName: 'Super Agros (Dealer)',
        bidPriceKg: currentBid,
        bidTime: 'Recent'
      }] : []))
    };
  }

  isMyAuction(a: AuctionItem): boolean {
    if (!this.user || this.user.role !== 'FARMER') return false;
    const currentName = (this.user.fullName || this.user.username || '').toLowerCase().trim();
    const farmer = (a.farmerName || '').toLowerCase().trim();
    const uid = String(this.user.id || this.user.userId || '');
    const fid = String(a.farmerId || '');
    const cleanUid = uid.replace(/\D/g, '');
    const cleanFid = fid.replace(/\D/g, '');
    return Boolean(
      (fid && uid && (fid === uid || (cleanUid && cleanFid && cleanUid === cleanFid))) ||
      (currentName && farmer && (farmer.includes(currentName) || currentName.includes(farmer)))
    );
  }

  isDealerParticipated(a: AuctionItem): boolean {
    if (!this.user || this.user.role !== 'DEALER') return false;
    const uid = String(this.user.id || this.user.userId || '');
    const cleanUid = uid.replace(/\D/g, '');
    const uname = (this.user.fullName || this.user.username || '').toLowerCase().trim();
    if (Array.isArray(a.bidsHistory)) {
      return a.bidsHistory.some(b => {
        const did = String(b.dealerId || '');
        const cleanDid = did.replace(/\D/g, '');
        return (did && uid && (did === uid || (cleanDid && cleanUid && cleanDid === cleanUid))) ||
          (b.bidderName && b.bidderName.toLowerCase().trim() === uname);
      });
    }
    return false;
  }

  isTimingCompleted(a: AuctionItem): boolean {
    if (a.status !== 'OPEN') return true;
    if (a.endTime) {
      return this.biddingService.parseAuctionDate(a.endTime).getTime() <= Date.now();
    }
    return false;
  }

  get filteredAuctions(): AuctionItem[] {
    return this.auctions.filter(a => {
      // Exclude auctions whose timing has completed or purchased
      if (this.isTimingCompleted(a)) {
        return false;
      }
      if (this.isMyBiddingsMode) {
        if (this.user?.role === 'FARMER' && !this.isMyAuction(a)) {
          return false;
        }
        if (this.user?.role === 'DEALER' && !this.isDealerParticipated(a)) {
          return false;
        }
      }
      const stateMatch = this.filterState === 'All' || (a.state && a.state.toLowerCase() === this.filterState.toLowerCase());
      const distMatch = this.filterDistrict === 'All' || (a.district && a.district.toLowerCase() === this.filterDistrict.toLowerCase());
      const commMatch = this.filterCommodity === 'All' || (a.cropName && a.cropName.toLowerCase().includes(this.filterCommodity.toLowerCase()));
      const searchMatch = !this.searchQuery.trim() ||
        (a.cropName && a.cropName.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (a.variety && a.variety.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (a.farmerName && a.farmerName.toLowerCase().includes(this.searchQuery.toLowerCase()));
      return stateMatch && distMatch && commMatch && searchMatch;
    });
  }

  pageSize = 12;
  Math = Math;

  get totalPages(): number {
    return Math.ceil(this.filteredAuctions.length / this.pageSize) || 1;
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedAuctions(): AuctionItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAuctions.slice(start, start + this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  closeBid(item: AuctionItem): void {
    const highestBidder = item.bidsHistory.length > 0 ? item.bidsHistory[0].bidderName : 'Super Agros (Dealer)';
    const highestBid = item.currentBidKg;
    const fullStockTotal = highestBid * item.totalQuantityKg;

    if (confirm(`Close Bidding Floor: Sell "${item.cropName}" (${item.totalQuantityKg} kg) to highest bidder ${highestBidder || 'winner'} at ₹${highestBid}/kg?\n\nTotal Full Stock Valuation: ₹${fullStockTotal.toLocaleString()}.\n\nThis will debit the dealer's digital wallet, credit your wallet, and finalize the order.`)) {
      item.status = 'CLOSED';
      this.toastMsg = `✓ Success! "${item.cropName}" awarded and sold to ${highestBidder || 'winner'} at ₹${highestBid}/kg! ₹${fullStockTotal.toLocaleString()} credited to your wallet.`;

      const dealerUid = (item.bidsHistory.length > 0 && (item.bidsHistory[0] as any).dealerId)
        ? String((item.bidsHistory[0] as any).dealerId)
        : (this.user?.role === 'DEALER' ? String(this.user.id || this.user.userId || '2') : '2');
      const farmerUid = item.farmerId || this.user?.id || '1';
      const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);

      // 1. Consume Reserved Escrow Funds from Dealer's Wallet
      const refId = 'BID-' + item.id + '-' + dealerUid;
      this.walletService.consumeFunds(
        dealerUid,
        refId,
        fullStockTotal,
        `Bidding Won: Payment for Lot #${item.id} - ${item.cropName} (${item.totalQuantityKg} Kg)`,
        orderId
      ).subscribe();

      // 2. Credit Farmer's Digital Wallet
      this.walletService.creditWallet(
        farmerUid,
        fullStockTotal,
        `Received Bidding Proceeds for Lot #${item.id}: ${item.cropName} (${item.totalQuantityKg} Kg) from ${highestBidder || 'Dealer'}`
      ).subscribe();

      // 3. Register Order in OrderService as completed bidding lot
      const newOrder: any = {
        id: orderId,
        cropId: String(item.id),
        cropName: item.cropName,
        quantity: item.totalQuantityKg,
        pricePerUnit: highestBid,
        totalAmount: fullStockTotal,
        farmerId: farmerUid,
        farmerName: item.farmerName || null,
        dealerId: dealerUid,
        dealerName: highestBidder || null,
        status: 'DELIVERED',
        orderDate: new Date().toISOString(),
        deliveryAddress: item.location || 'APMC Yard Mandi Gate 2',
        fulfillmentType: 'SELF_PICKUP',
        isBidding: true
      };
      this.orderService.createOrder(newOrder).subscribe();

      // 4. Create certified Tax Invoice in InvoiceService
      const invoicePayload: Invoice = {
        id: 'inv-' + orderId,
        invoiceNumber: 'CD-INV-2026-' + orderId.replace('ORD-', ''),
        orderId: orderId,
        dealerId: dealerUid,
        dealerName: highestBidder,
        dealerPhone: '+91 98722 55667',
        dealerAddress: 'Commercial Grain Terminal, Mandi Gate 2, New Delhi',
        dealerGstin: '07AABCC8901Z1Z8',
        farmerId: farmerUid,
        farmerName: item.farmerName || 'Sardar Gurpreet Singh',
        farmerPhone: item.farmerPhone || '+91 98140 11223',
        farmerAddress: item.location || 'APMC Yard Mandi Gate 2',
        farmerPan: 'AABPG7812F',
        cropName: item.cropName,
        cropVariety: item.variety || 'Mandi Bidding Grade',
        hsnCode: '1001',
        quantity: item.totalQuantityKg,
        unit: 'Kg',
        pricePerUnit: highestBid,
        totalAmount: fullStockTotal,
        taxAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        deliveryFee: 0,
        deliveryDistanceKm: 0,
        deliveryAddress: item.location || 'APMC Yard Mandi Gate 2',
        finalAmount: fullStockTotal,
        paymentMethod: 'CropDeal Digital Escrow Wallet',
        transactionId: 'TXN-BID-' + Math.floor(100000 + Math.random() * 900000),
        status: 'PAID',
        issuedAt: new Date().toISOString()
      };
      this.invoiceService.createInvoice(invoicePayload).subscribe();

      const numOrderId = parseInt(String(orderId).replace(/\D/g, ''), 10) || 1001;
      const numDealerId = parseInt(String(dealerUid).replace(/\D/g, ''), 10) || 2;
      const numFarmerId = parseInt(String(farmerUid).replace(/\D/g, ''), 10) || 1;

      // Persist Payment in PaymentService
      this.paymentService.makePayment({
        orderId: numOrderId,
        dealerId: numDealerId,
        farmerId: numFarmerId,
        amount: fullStockTotal,
        paymentMethod: 'WALLET'
      }).subscribe();

      // Persist Delivery in DeliveryService
      this.deliveryService.createDelivery({
        orderId: orderId,
        dealerId: String(dealerUid),
        farmerId: String(farmerUid),
        cropName: item.cropName || null,
        cropQuantity: item.totalQuantityKg || null,
        cropUnit: 'Kg',
        farmerName: item.farmerName || null,
        dealerName: highestBidder || null,
        fulfillmentType: 'SELF_PICKUP',
        pickupAddress: item.location || null,
        dropAddress: 'Dealer Mandi Facility',
        status: 'DELIVERED'
      }).subscribe();

      // 5. Close and delete auction in BiddingService so it is removed from live bidding floor
      this.biddingService.closeAuction(item.id, orderId, fullStockTotal).subscribe();
      this.biddingService.deleteAuction(item.id).subscribe();
      this.auctions = this.auctions.filter(a => a.id !== item.id);

      // 6. Deduct or delete crop post from CropService if matching
      this.cropService.getAllCrops().subscribe(allCrops => {
        const matchingCrop = (allCrops || []).find(c =>
          c.id === item.id ||
          (c.cropName.toLowerCase() === item.cropName.toLowerCase() && (c.farmerId === farmerUid || c.farmerName === item.farmerName))
        );
        if (matchingCrop) {
          const currentStock = matchingCrop.quantity || matchingCrop.availableQuantity || 0;
          const remainingStock = Math.max(0, currentStock - item.totalQuantityKg);
          const cId = String(matchingCrop.id || matchingCrop.cropId);
          if (remainingStock <= 0) {
            this.cropService.deleteCrop(cId).subscribe();
          } else {
            this.cropService.updateCrop(cId, { quantity: remainingStock, availableQuantity: remainingStock } as any).subscribe();
          }
        }
      });

      // 7. Notify highest bidder (dealer) and farmer
      this.notificationService.sendNotification(
        dealerUid,
        '🏆 Auction Won & Finalized!',
        `Congratulations! You won the bidding floor for "${item.cropName}" (${item.totalQuantityKg} kg) at ₹${highestBid}/kg from farmer ${item.farmerName}. Order #${orderId} created and ₹${fullStockTotal.toLocaleString()} debited from your wallet.`,
        'BID'
      );
      this.notificationService.sendNotification(
        farmerUid,
        '🤝 Auction Floor Closed & Settled',
        `Your live auction for "${item.cropName}" (${item.totalQuantityKg} kg) was awarded to highest bidder ${highestBidder} at ₹${highestBid}/kg. ₹${fullStockTotal.toLocaleString()} credited to your wallet.`,
        'BID'
      );

      this.biddingService.closeAuction(item.id, orderId, fullStockTotal).subscribe();
      this.biddingService.deleteAuction(item.id).subscribe();
      this.auctions = this.auctions.filter(a => a.id !== item.id);

      setTimeout(() => this.toastMsg = '', 6000);
    }
  }

  cancelBid(item: AuctionItem): void {
    if (confirm(`Are you sure you want to cancel the bidding lot for "${item.cropName}"?`)) {
      // Release any active escrow reservations on this lot back to bidder
      if (item.highestBidderId && (item.bidsCount > 0 || (item.bidsHistory && item.bidsHistory.length > 0))) {
        const fullStockTotal = item.currentBidKg * item.totalQuantityKg;
        this.walletService.releaseFunds(
          String(item.highestBidderId),
          'BID-' + item.id + '-' + item.highestBidderId,
          fullStockTotal,
          `Bid Escrow Released: Auction #${item.id} (${item.cropName}) cancelled by host`
        ).subscribe();
      }
      this.biddingService.deleteAuction(item.id).subscribe();
      this.auctions = this.auctions.filter(a => a.id !== item.id);
      this.toastMsg = `✓ Bidding lot for "${item.cropName}" has been cancelled and removed from live bidding floor.`;
      setTimeout(() => this.toastMsg = '', 5000);
    }
  }

  // Intercept guest action!
  onPlaceBidClick(item: AuctionItem): void {
    if (!this.user) {
      this.authModalService.open(`Authentication Required: Please sign in or quick-login as a Dealer to place a bid on ${item.cropName}.`);
      return;
    }
    if (this.user.role !== 'DEALER') {
      alert('⚠️ Only verified commercial dealers can place bids in the live bidding floor. Other roles can only view auctions.');
      return;
    }
    const uid = String(this.user.id || this.user.userId || 'dealer-1');
    this.dealerWalletBalance = this.walletService.getStoredBalance(uid);
    this.selectedAuction = item;
    this.userBidPrice = item.bidsCount === 0 ? item.startingPriceKg : +(item.currentBidKg + 0.5).toFixed(2);
    this.onBidPriceChange();
  }

  isBidAmountValid(): boolean {
    if (!this.selectedAuction || this.userBidPrice == null) return false;
    if (this.selectedAuction.bidsCount === 0) {
      return this.userBidPrice >= this.selectedAuction.startingPriceKg;
    }
    return this.userBidPrice > this.selectedAuction.currentBidKg;
  }

  toggleFavorite(item: AuctionItem): void {
    if (!this.user) {
      this.authModalService.open('Please sign in or quick-login to add auctions to your watchlist.');
      return;
    }
    item.isFavorite = !item.isFavorite;
  }

  onBidPriceChange(): void {
    if (this.selectedAuction) {
      this.calculatedTotalAmount = Math.round((this.userBidPrice || 0) * this.selectedAuction.totalQuantityKg);
    }
  }

  setQuickBid(increment: number): void {
    if (!this.selectedAuction) return;
    this.userBidPrice = +(this.selectedAuction.currentBidKg + increment).toFixed(2);
    this.onBidPriceChange();
  }

  submitBidOnAuction(): void {
    if (!this.selectedAuction || !this.user) return;

    if (this.user.role !== 'DEALER') {
      alert('⚠️ Only verified commercial dealers can place bids in the auction floor.');
      return;
    }

    if (!this.userBidPrice) {
      alert('Please enter a valid bid amount.');
      return;
    }

    if (this.selectedAuction.bidsCount === 0 && this.userBidPrice < this.selectedAuction.startingPriceKg) {
      alert(`Your bid must be equal to or higher than the starting price of ₹${this.selectedAuction.startingPriceKg}/Kg.`);
      return;
    }

    if (this.selectedAuction.bidsCount > 0 && this.userBidPrice <= this.selectedAuction.currentBidKg) {
      alert(`Your bid must be higher than current highest bid of ₹${this.selectedAuction.currentBidKg}/Kg.`);
      return;
    }

    const uid = String(this.user.id || this.user.userId || 'dealer-1');
    const totalCommitment = Math.round(Number(this.userBidPrice) * Number(this.selectedAuction.totalQuantityKg || 1));
    const currentAvailable = this.walletService.getStoredAvailableBalance(uid);

    const prevHighestBidderId = this.selectedAuction.highestBidderId;
    const isRaisingOwn = prevHighestBidderId && String(prevHighestBidderId) === uid;
    const prevCommitment = isRaisingOwn ? Math.round(Number(this.selectedAuction.currentBidKg) * Number(this.selectedAuction.totalQuantityKg || 1)) : 0;
    const effectiveAvailable = currentAvailable + prevCommitment;

    if (effectiveAvailable < totalCommitment) {
      alert(`⚠️ Insufficient Net Escrow Balance!\n\nTo place a bid for the full lot (${this.selectedAuction.totalQuantityKg} Kg @ ₹${this.userBidPrice}/Kg), you must have at least ₹${totalCommitment.toLocaleString()} in your Net Escrow Balance.\nYour Current Net Escrow Balance: ₹${currentAvailable.toLocaleString()} (Available Balance: ₹${this.dealerWalletBalance.toLocaleString()} with ₹${this.dealerReservedBalance.toLocaleString()} reserved in active bids).\n\nPlease top up your wallet or wait for other bids to release.`);
      return;
    }

    const bidder = this.user?.fullName || this.user?.username || 'Apex Agro Mills Ltd';
    const closedAuction = this.selectedAuction;
    const bidAmount = this.userBidPrice;
    const refId = 'BID-' + closedAuction.id + '-' + uid;

    this.selectedAuction.currentBidKg = this.userBidPrice;
    this.selectedAuction.bidsCount = (this.selectedAuction.bidsCount || 0) + 1;
    this.selectedAuction.highestBidderId = uid;
    this.selectedAuction.highestBidderName = bidder;
    this.selectedAuction.bidsHistory.unshift({
      dealerId: uid,
      bidderName: bidder,
      bidPriceKg: this.userBidPrice,
      bidTime: 'Just now'
    });

    const found = this.auctions.find(a => a.id === this.selectedAuction!.id);
    if (found) {
      found.currentBidKg = this.userBidPrice;
      found.bidsCount = (found.bidsCount || 0) + 1;
      found.highestBidderId = uid;
      found.highestBidderName = bidder;
      found.bidsHistory.unshift({
        dealerId: uid,
        bidderName: bidder,
        bidPriceKg: this.userBidPrice,
        bidTime: 'Just now'
      });
    }

    // Persist bid offer in bidding service (backend handles single reservation)
    const offer: BidOffer = {
      biddingId: closedAuction.id,
      dealerId: uid,
      dealerName: bidder,
      bidAmount: bidAmount,
      bidTime: new Date().toISOString()
    };
    this.biddingService.placeBid(offer).subscribe({
      next: () => {
        this.walletService.getWallet(uid).subscribe();
        this.walletService.getTransactions(uid).subscribe();
        this.biddingService.getActiveAuctions().subscribe(res => {
          if (res) {
            const deletedIds = this.biddingService.getDeletedAuctionIds();
            this.auctions = res
              .filter(a => !deletedIds.has(String(a.id)) && (a.status === 'OPEN' || !a.status))
              .map(sa => this.mapServerAuctionToItem(sa));
            this.updateCountdowns();
          }
        });
      },
      error: (err) => {
        alert(err?.error?.message || err?.message || 'Failed to place bid. Please check your wallet balance.');
      }
    });

    // Send notifications to Farmer and Dealer
    const farmerId = closedAuction.farmerId || 'farmer-1';
    const dealerId = this.user?.id || this.user?.userId || 'dealer-1';

    this.notificationService.sendNotification(
      farmerId,
      '🔨 New Incoming Bid',
      `Dealer ${bidder} placed a new highest bid of ₹${bidAmount}/kg on your crop "${closedAuction.cropName}" (Total Full Stock: ₹${totalCommitment.toLocaleString()}).`,
      'BID'
    );
    this.notificationService.sendNotification(
      dealerId,
      '🔒 Bid Placed with Escrow Reservation',
      `Your bid of ₹${bidAmount}/kg on "${closedAuction.cropName}" has been placed. ₹${totalCommitment.toLocaleString()} is securely held in your wallet escrow.`,
      'BID'
    );

    this.toastMsg = `🎉 Your bid of ₹${this.userBidPrice}/Kg for ${closedAuction.cropName} (Total: ₹${totalCommitment.toLocaleString()}) has been placed with escrow backing!`;
    this.selectedAuction = null;

    setTimeout(() => { this.toastMsg = ''; }, 6000);
  }

  onBiddingFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    this.selectedBiddingFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedBiddingPreview = e.target.result;
      if (!this.newCropImage) {
        this.newCropImage = e.target.result;
      }
    };
    reader.readAsDataURL(file);

    this.isUploadingBiddingImage = true;
    this.biddingService.uploadBiddingImage(file).subscribe({
      next: (res: any) => {
        this.isUploadingBiddingImage = false;
        const uploadedUrl = res.photoUrl || res.imageUrl || res.url;
        if (uploadedUrl) {
          this.cloudinaryBiddingUrl = uploadedUrl;
          this.newCropImage = uploadedUrl;
        }
      },
      error: (err) => {
        console.warn('Bidding image upload warning:', err);
        this.isUploadingBiddingImage = false;
        if (this.selectedBiddingPreview) {
          this.newCropImage = this.selectedBiddingPreview;
        }
      }
    });
  }

  openCreateModal(): void {
    if (!this.user) {
      this.authModalService.open('Please sign in or quick-login to create auctions.');
      return;
    }
    this.newCropName = '';
    this.newQuantityKg = 5000;
    this.newStartingPriceKg = 20.00;
    this.newCropImage = '';
    this.selectedBiddingFile = null;
    this.selectedBiddingPreview = null;
    this.cloudinaryBiddingUrl = null;
    this.isUploadingBiddingImage = false;
    this.auctionDurationHours = 6;
    this.showCreateModal = true;
  }

  createAuctionSubmit(): void {
    if (!this.newCropName.trim()) {
      alert('Please enter crop name.');
      return;
    }

    const durationHours = Number(this.auctionDurationHours || 6);
    const endIso = new Date(Date.now() + durationHours * 3600000).toISOString();
    const finalImageUrl = this.cloudinaryBiddingUrl || this.newCropImage || this.selectedBiddingPreview || resolveCropImage(this.newCropName);
    const farmerName = this.user?.fullName || this.user?.username || 'Farmer';
    const farmerId = String(this.user?.id || this.user?.userId || '4');

    this.biddingService.createAuction({
      cropName: this.newCropName,
      variety: 'Grade A Produce',
      grade: 'A Grade',
      image: finalImageUrl,
      location: 'Coimbatore, Tamil Nadu',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      startingPrice: this.newStartingPriceKg,
      currentHighestBid: this.newStartingPriceKg,
      quantity: this.newQuantityKg,
      unit: 'Kg',
      endTime: endIso,
      durationHours: durationHours,
      farmerName: farmerName,
      farmerPhone: '+91 98140 11223',
      farmerId: farmerId,
      status: 'OPEN',
      imageUrl: finalImageUrl,
      photoUrl: finalImageUrl,
      bidsCount: 0
    } as any).subscribe({
      next: () => {
        this.loadAuctions();
      },
      error: (err) => {
        console.warn('Auction creation fallback to local reload:', err);
        this.loadAuctions();
      }
    });

    this.showCreateModal = false;
    this.toastMsg = `🎉 New Bidding Floor for "${this.newCropName}" launched! Dealers can place bids now.`;

    // Notify registered dealers about new auction
    this.notificationService.sendNotification(
      'dealer-1',
      '📢 New Live Auction Floor Launched',
      `Farmer ${farmerName} opened a new live auction floor for "${this.newCropName}" (${this.newQuantityKg} kg) starting at ₹${this.newStartingPriceKg}/kg.`,
      'BID'
    );

    setTimeout(() => { this.toastMsg = ''; }, 6000);
  }

  onThumbError(event: any, cropName?: string): void {
    if (cropName) {
      event.target.src = resolveCropImage(cropName);
    } else {
      event.target.src = '/assets/images/crop-rice.jpg';
    }
  }
}
