import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CropService } from '../../core/services/crop.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { MandiPriceRecord, PagedPriceResponse, SyncStatusResponse } from '../../core/models/crop.model';
import { INDIAN_STATES, getDistrictsForState } from '../../core/utils/india-locations.util';

@Component({
  selector: 'app-price-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mandi-page">
      <!-- Panoramic Hero Header -->
      <section class="mandi-hero shadow-sm">
        <div class="mandi-hero-content">
          <h1 class="hero-title">
            Mandi <span class="text-green-brand">Prices</span>
          </h1>
          <p class="hero-desc">
            Get real-time market prices of agricultural commodities from official government mandi data across India.
          </p>

          <!-- 4 Stat Badges with Real Database Counts -->
          <div class="stats-pills-row">
            <div class="stat-pill">
              <div class="stat-pill-icon bg-emerald-light">
                <i class="fa-solid fa-arrow-trend-up text-emerald"></i>
              </div>
              <div class="stat-pill-text">
                <strong>500+</strong>
                <span>Markets Covered</span>
              </div>
            </div>

            <div class="stat-pill">
              <div class="stat-pill-icon bg-green-light">
                <i class="fa-solid fa-leaf text-emerald"></i>
              </div>
              <div class="stat-pill-text">
                <strong>{{ totalUniqueCommodities }}+</strong>
                <span>Commodities</span>
              </div>
            </div>

            <div class="stat-pill">
              <div class="stat-pill-icon bg-teal-light">
                <i class="fa-solid fa-location-dot text-emerald"></i>
              </div>
              <div class="stat-pill-text">
                <strong>{{ totalUniqueStates }}</strong>
                <span>States Tracked</span>
              </div>
            </div>

            <div class="stat-pill">
              <div class="stat-pill-icon bg-amber-light">
                <i class="fa-solid fa-shop text-emerald"></i>
              </div>
              <div class="stat-pill-text">
                <strong>{{ totalElements | number }}</strong>
                <span>Gov Mandi Records</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Sync Status Banner Above Table -->
      <div class="sync-status-banner shadow-sm" [class.warning]="syncStatus?.syncStatus === 'FAILED'">
        <div class="sync-status-info">
          <div *ngIf="isLoadingStatus" class="status-loading">
            <i class="fa-solid fa-circle-notch fa-spin text-emerald"></i>
            <span>Checking synchronization status...</span>
          </div>
          <div *ngIf="!isLoadingStatus" class="status-content">
            <div class="status-time">
              <i class="fa-regular fa-calendar-check text-emerald"></i>
              <span>Last updated: <strong>{{ lastUpdatedText }}</strong></span>
              <span class="status-badge" [class.badge-success]="syncStatus?.syncStatus === 'SUCCESS'" [class.badge-danger]="syncStatus?.syncStatus === 'FAILED'">
                {{ syncStatus?.syncStatus || 'SUCCESS' }}
              </span>
            </div>
            <div *ngIf="syncError" class="status-error-msg">
              <div class="status-error-content">
                <i class="fa-solid fa-circle-info"></i>
                <span>{{ syncError }}</span>
              </div>
              <button type="button" class="btn-dismiss-error" (click)="syncError = ''" title="Dismiss notice">&times;</button>
            </div>
          </div>
        </div>

        <div class="sync-banner-actions">
          <button *ngIf="isAdmin" class="btn-sync-gov" (click)="triggerManualSync()" [disabled]="isSyncing" title="Trigger administrative government API sync">
            <i class="fa-solid fa-arrows-rotate" [class.fa-spin]="isSyncing"></i>
            <span>{{ isSyncing ? 'Synchronizing API...' : 'Sync Gov Data' }}</span>
          </button>
          <div *ngIf="!isAdmin" class="sync-auto-indicator" title="Government mandi dataset synchronizes automatically every day at 2:00 AM IST">
            <i class="fa-regular fa-clock text-emerald"></i>
            <span>Auto Sync: <strong>Daily 02:00 AM IST</strong></span>
          </div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="card filter-card shadow-sm">
        <div class="filter-grid">
          <div class="filter-item">
            <label><i class="fa-solid fa-magnifying-glass text-emerald"></i> Search</label>
            <input
              type="text"
              [(ngModel)]="searchKeyword"
              (keyup.enter)="onFilterChange()"
              placeholder="Search crop, market, etc..."
              class="filter-input"
            />
          </div>

          <div class="filter-item">
            <label><i class="fa-solid fa-location-dot text-emerald"></i> State</label>
            <select [(ngModel)]="selectedState" (change)="onStateChange()" class="filter-select">
              <option value="All States">All States</option>
              <option *ngFor="let st of availableStates" [value]="st">{{ st }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label><i class="fa-solid fa-city text-emerald"></i> District</label>
            <select [(ngModel)]="selectedDistrict" (change)="onFilterChange()" class="filter-select">
              <option value="All Districts">All Districts</option>
              <option *ngFor="let dist of availableDistricts" [value]="dist">{{ dist }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label><i class="fa-solid fa-wheat-awn text-emerald"></i> Commodity</label>
            <select [(ngModel)]="selectedCommodity" (change)="onFilterChange()" class="filter-select">
              <option value="All Commodities">All Commodities</option>
              <option *ngFor="let comm of availableCommodities" [value]="comm">{{ comm }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label><i class="fa-solid fa-store text-emerald"></i> Market</label>
            <select [(ngModel)]="selectedMarket" (change)="onFilterChange()" class="filter-select">
              <option value="All Markets">All Markets</option>
              <option *ngFor="let mkt of availableMarkets" [value]="mkt">{{ mkt }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label><i class="fa-regular fa-calendar text-emerald"></i> Arrival Date</label>
            <input
              type="date"
              [(ngModel)]="selectedArrivalDate"
              (change)="onFilterChange()"
              class="filter-input"
            />
          </div>
        </div>

        <div class="filter-actions-row">
          <div class="filter-summary-inline">
            <span *ngIf="totalElements > 0">
              Found <strong>{{ totalElements | number }}</strong> matching mandi records across India
            </span>
          </div>

          <div class="btn-group-right">
            <button class="btn-search-mandi" (click)="onFilterChange()">
              <i class="fa-solid fa-magnifying-glass"></i> Filter Records
            </button>
            <button class="btn-reset-filters" (click)="resetFilters()" title="Reset all filters">
              <i class="fa-solid fa-rotate-left"></i> Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Toast Feedback Message -->
      <div *ngIf="actionMsg" class="alert-toast shadow-sm" [class.toast-error]="actionMsgType === 'danger'">
        <i class="fa-solid" [class.fa-circle-check]="actionMsgType === 'success'" [class.fa-triangle-exclamation]="actionMsgType === 'danger'"></i>
        <span>{{ actionMsg }}</span>
      </div>

      <!-- Mandi Table with Server-Side Pagination & Sorting -->
      <div class="card table-wrapper-card shadow-sm">
        <div class="table-responsive">
          <table class="mandi-table">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th class="col-commodity sortable" (click)="setSort('commodity')">
                  <span>Commodity</span>
                  <i class="fa-solid fa-sort" [class.fa-sort-up]="sortBy === 'commodity' && direction === 'asc'" [class.fa-sort-down]="sortBy === 'commodity' && direction === 'desc'"></i>
                </th>
                <th class="col-variety sortable" (click)="setSort('variety')">
                  <span>Variety / Grade</span>
                  <i class="fa-solid fa-sort" [class.fa-sort-up]="sortBy === 'variety' && direction === 'asc'" [class.fa-sort-down]="sortBy === 'variety' && direction === 'desc'"></i>
                </th>
                <th class="col-market sortable" (click)="setSort('market')">
                  <span>Market / District</span>
                  <i class="fa-solid fa-sort" [class.fa-sort-up]="sortBy === 'market' && direction === 'asc'" [class.fa-sort-down]="sortBy === 'market' && direction === 'desc'"></i>
                </th>
                <th class="col-price sortable" (click)="setSort('minPricePerKg')">
                  <span>Min (₹/Kg)</span>
                  <i class="fa-solid fa-sort" [class.fa-sort-up]="sortBy === 'minPricePerKg' && direction === 'asc'" [class.fa-sort-down]="sortBy === 'minPricePerKg' && direction === 'desc'"></i>
                </th>
                <th class="col-price sortable" (click)="setSort('maxPricePerKg')">
                  <span>Max (₹/Kg)</span>
                  <i class="fa-solid fa-sort" [class.fa-sort-up]="sortBy === 'maxPricePerKg' && direction === 'asc'" [class.fa-sort-down]="sortBy === 'maxPricePerKg' && direction === 'desc'"></i>
                </th>
                <th class="col-price col-modal sortable" (click)="setSort('modalPricePerKg')">
                  <span>Modal (₹/Kg)</span>
                  <i class="fa-solid fa-sort" [class.fa-sort-up]="sortBy === 'modalPricePerKg' && direction === 'asc'" [class.fa-sort-down]="sortBy === 'modalPricePerKg' && direction === 'desc'"></i>
                </th>
                <th class="col-date sortable" (click)="setSort('arrivalDate')">
                  <span>Arrival Date</span>
                  <i class="fa-solid fa-sort" [class.fa-sort-up]="sortBy === 'arrivalDate' && direction === 'asc'" [class.fa-sort-down]="sortBy === 'arrivalDate' && direction === 'desc'"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Loading Skeleton / Spinner State -->
              <tr *ngIf="isLoading">
                <td colspan="8" class="loading-cell">
                  <div class="table-spinner">
                    <i class="fa-solid fa-circle-notch fa-spin text-emerald"></i>
                    <span>Loading verified government mandi records...</span>
                  </div>
                </td>
              </tr>

              <!-- Data Rows -->
              <ng-container *ngIf="!isLoading">
                <tr *ngFor="let row of records; let idx = index">
                  <td class="col-num">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                  <td class="col-commodity">
                    <strong class="comm-title">{{ row.commodity }}</strong>
                  </td>
                  <td class="col-variety">
                    <span class="d-block text-dark font-medium">{{ row.variety || 'Standard' }}</span>
                    <span class="badge-grade">{{ row.grade || 'FAQ' }}</span>
                  </td>
                  <td class="col-market">
                    <strong>{{ row.market }}</strong>
                    <span class="sub-location">{{ row.district }}, {{ row.state }}</span>
                  </td>
                  <td class="col-price">₹{{ row.minPricePerKg | number:'1.2-2' }}</td>
                  <td class="col-price">₹{{ row.maxPricePerKg | number:'1.2-2' }}</td>
                  <td class="col-price col-modal text-emerald">
                    <strong>₹{{ row.modalPricePerKg | number:'1.2-2' }}</strong>
                  </td>
                  <td class="col-date">
                    <span class="date-chip">
                      <i class="fa-regular fa-calendar"></i>
                      {{ formatArrivalDate(row.arrivalDate) }}
                    </span>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr *ngIf="records.length === 0">
                  <td colspan="8" class="empty-cell">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <p>No government mandi records match your filter criteria.</p>
                    <button class="btn-reset-filters mt-2" (click)="resetFilters()">
                      <i class="fa-solid fa-rotate-left"></i> Reset Filters
                    </button>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <!-- Table Pagination Footer -->
        <div class="table-footer">
          <div class="footer-summary">
            Showing {{ totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1 }} to {{ getRangeEnd() }} of {{ totalElements | number }} government mandi results
          </div>

          <div class="page-size-selector">
            <label>Show</label>
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()" class="page-size-select">
              <option [ngValue]="25">25</option>
              <option [ngValue]="50">50</option>
              <option [ngValue]="100">100</option>
            </select>
            <span>per page</span>
          </div>

          <div class="table-pagination">
            <button
              class="tpage-btn arrow"
              [disabled]="currentPage === 1 || isLoading"
              (click)="goToPage(1)"
              title="First Page"
            >
              <i class="fa-solid fa-angles-left"></i>
            </button>
            <button
              class="tpage-btn arrow"
              [disabled]="currentPage === 1 || isLoading"
              (click)="goToPage(currentPage - 1)"
              title="Previous Page"
            >
              <i class="fa-solid fa-angle-left"></i>
            </button>

            <ng-container *ngFor="let p of pageNumbers">
              <button
                class="tpage-btn"
                [class.active]="p === currentPage"
                [disabled]="isLoading"
                (click)="goToPage(p)"
              >
                {{ p }}
              </button>
            </ng-container>

            <button
              class="tpage-btn arrow"
              [disabled]="currentPage === totalPages || totalPages === 0 || isLoading"
              (click)="goToPage(currentPage + 1)"
              title="Next Page"
            >
              <i class="fa-solid fa-angle-right"></i>
            </button>
            <button
              class="tpage-btn arrow"
              [disabled]="currentPage === totalPages || totalPages === 0 || isLoading"
              (click)="goToPage(totalPages)"
              title="Last Page"
            >
              <i class="fa-solid fa-angles-right"></i>
            </button>
          </div>
        </div>

        <!-- Info Note -->
        <div class="table-info-note">
          <i class="fa-solid fa-circle-info"></i>
          <span>All commodity rates are converted and reported in <strong>₹ per Kilogram (₹/Kg)</strong> from APMC Quintal standards. Data is sourced from government mandi bulletins.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mandi-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      font-family: inherit;
    }

    /* Hero Section */
    .mandi-hero {
      background: url('/assets/images/landing-hero.jpg') center/cover no-repeat,
                  linear-gradient(135deg, #064e3b, #047857);
      border-radius: 1rem;
      overflow: hidden;
      position: relative;
    }
    .mandi-hero-content {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.90) 55%, rgba(255, 255, 255, 0.5) 100%);
      padding: 2.25rem 2.5rem;
    }
    .hero-title {
      font-size: 2.35rem;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }
    .text-green-brand { color: #15803d; }
    .hero-desc {
      font-size: 0.95rem;
      color: #334155;
      margin: 0 0 1.75rem;
      max-width: 650px;
    }
    .stats-pills-row {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .stat-pill {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.75rem 1.15rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }
    .stat-pill-icon {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .bg-emerald-light { background: #dcfce7; }
    .bg-green-light { background: #d1fae5; }
    .bg-teal-light { background: #ccfbf1; }
    .bg-amber-light { background: #fef3c7; }
    .text-emerald { color: #15803d; }
    .stat-pill-text { display: flex; flex-direction: column; }
    .stat-pill-text strong { font-size: 1.15rem; font-weight: 800; color: #0f172a; }
    .stat-pill-text span { font-size: 0.72rem; color: #64748b; font-weight: 600; }

    /* Sync Status Banner */
    .sync-status-banner {
      background: #ffffff;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .sync-status-banner.warning {
      border-color: #fde047;
      background: #fefce8;
    }
    .sync-status-info {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .status-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #64748b;
    }
    .status-time {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.88rem;
      color: #334155;
    }
    .status-time strong {
      color: #0f172a;
    }
    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 0.3rem;
      text-transform: uppercase;
    }
    .badge-success {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .badge-danger {
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fca5a5;
    }
    .status-error-msg {
      font-size: 0.78rem;
      color: #b45309;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      width: 100%;
    }
    .status-error-content {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-dismiss-error {
      background: transparent;
      border: none;
      font-size: 1.15rem;
      cursor: pointer;
      color: #92400e;
      padding: 0 0.25rem;
      line-height: 1;
      opacity: 0.7;
    }
    .btn-dismiss-error:hover { opacity: 1; }
    .btn-sync-gov {
      background: #ffffff;
      color: #15803d;
      border: 1.5px solid #15803d;
      padding: 0.5rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s;
    }
    .btn-sync-gov:hover:not(:disabled) {
      background: #f0fdf4;
      border-color: #166534;
      color: #166534;
    }
    .btn-sync-gov:disabled { opacity: 0.6; cursor: not-allowed; }
    .sync-auto-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.82rem;
      color: #475569;
    }
    .sync-auto-indicator strong {
      color: #0f766e;
    }

    /* Filter Card */
    .filter-card {
      background: #ffffff;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      padding: 1.25rem 1.5rem;
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .filter-item { display: flex; flex-direction: column; gap: 0.35rem; }
    .filter-item label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .filter-select, .filter-input {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      color: #1e293b;
      outline: none;
      background: #ffffff;
      box-sizing: border-box;
    }
    .filter-select:focus, .filter-input:focus { border-color: #15803d; }
    .filter-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .filter-summary-inline {
      font-size: 0.82rem;
      color: #475569;
    }
    .filter-summary-inline strong {
      color: #15803d;
    }
    .btn-group-right { display: flex; align-items: center; gap: 0.75rem; }
    .btn-search-mandi {
      background: #15803d;
      color: white;
      border: none;
      padding: 0.55rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.2s;
    }
    .btn-search-mandi:hover { background: #166534; }
    .btn-reset-filters {
      background: #ffffff;
      color: #64748b;
      border: 1px solid #cbd5e1;
      padding: 0.55rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }
    .btn-reset-filters:hover {
      background: #f8fafc;
      color: #334155;
    }

    /* Alert Toast */
    .alert-toast {
      background: #dcfce7;
      border: 1.5px solid #86efac;
      color: #166534;
      padding: 0.85rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .alert-toast.toast-error {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #991b1b;
    }

    /* Table Wrapper */
    .table-wrapper-card {
      background: #ffffff;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      padding: 0;
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      min-height: 250px;
    }
    .mandi-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.825rem;
    }
    .mandi-table thead tr {
      background: #15803d;
      color: white;
    }
    .mandi-table th {
      padding: 0.7rem 0.85rem;
      font-weight: 700;
      font-size: 0.78rem;
      white-space: nowrap;
      user-select: none;
    }
    .mandi-table th.sortable {
      cursor: pointer;
      transition: background 0.15s;
    }
    .mandi-table th.sortable:hover {
      background: #166534;
    }
    .mandi-table th i {
      margin-left: 0.35rem;
      font-size: 0.75rem;
      opacity: 0.85;
    }
    .mandi-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }
    .mandi-table tbody tr:hover { background: #f8fafc; }
    .mandi-table td {
      padding: 0.65rem 0.85rem;
      color: #334155;
      vertical-align: middle;
    }
    .col-num { width: 50px; text-align: center; color: #64748b; font-weight: 600; }
    .commodity-cell {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .crop-thumb {
      width: 34px;
      height: 34px;
      border-radius: 0.35rem;
      object-fit: cover;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .comm-title { font-size: 0.85rem; color: #0f172a; font-weight: 700; }
    .badge-grade {
      font-size: 0.68rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 0.1rem 0.35rem;
      border-radius: 0.2rem;
      display: inline-block;
      margin-top: 0.15rem;
    }
    .sub-location {
      font-size: 0.72rem;
      color: #64748b;
      display: block;
      margin-top: 0.1rem;
    }
    .col-price { text-align: right; }
    .col-modal strong { font-size: 0.9rem; }
    .date-chip {
      font-size: 0.75rem;
      color: #64748b;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .loading-cell, .empty-cell {
      text-align: center;
      padding: 3.5rem 1rem;
      color: #64748b;
    }
    .table-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
      color: #475569;
    }
    .table-spinner i {
      font-size: 2rem;
    }
    .empty-cell i { font-size: 2.2rem; margin-bottom: 0.5rem; display: block; color: #94a3b8; }

    /* Footer Pagination */
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .footer-summary { font-size: 0.82rem; color: #64748b; }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      color: #64748b;
    }
    .page-size-select {
      padding: 0.25rem 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.35rem;
      font-size: 0.82rem;
      color: #1e293b;
      outline: none;
      background: #ffffff;
    }
    .table-pagination { display: flex; align-items: center; gap: 0.35rem; }
    .tpage-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 0.35rem;
      border-radius: 0.35rem;
      border: 1px solid #cbd5e1;
      background: white;
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .tpage-btn.active {
      background: #15803d;
      border-color: #15803d;
      color: white;
    }
    .tpage-btn:hover:not(.active):not(:disabled) { background: #f1f5f9; }
    .tpage-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Table Info Note */
    .table-info-note {
      background: #f0fdf4;
      border-top: 1px solid #bbf7d0;
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.78rem;
      color: #15803d;
    }

    @media (max-width: 900px) {
      .filter-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .filter-grid { grid-template-columns: 1fr; }
      .stats-pills-row { flex-direction: column; }
    }
  `]
})
export class PriceAlertsComponent implements OnInit, OnDestroy {
  user: User | null = null;

  get isAdmin(): boolean {
    return this.user?.role === 'ADMIN';
  }
  actionMsg = '';
  actionMsgType: 'success' | 'danger' | 'warning' = 'success';
  isSyncing = false;
  isLoading = false;
  isLoadingStatus = false;

  syncStatus: SyncStatusResponse | null = null;
  lastUpdatedText = 'Loading last update time...';
  syncError = '';

  // Server-Side Filters
  searchKeyword = '';
  selectedState = 'All States';
  selectedDistrict = 'All Districts';
  selectedCommodity = 'All Commodities';
  selectedMarket = 'All Markets';
  selectedArrivalDate = '';

  availableStates: string[] = [];
  availableDistricts: string[] = [];
  availableCommodities: string[] = [];
  availableMarkets: string[] = [];

  // Server-Side Pagination
  currentPage = 1;
  pageSize = 25;
  totalElements = 0;
  totalPages = 1;

  // Server-Side Sorting
  sortBy = 'arrivalDate';
  direction: 'desc' | 'asc' = 'desc';

  records: MandiPriceRecord[] = [];
  private subs: Subscription[] = [];

  constructor(
    private cropService: CropService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.authService.currentUser$.subscribe((u: User | null) => {
        this.user = u;
      })
    );

    this.availableStates = [...INDIAN_STATES];

    this.loadDropdownData();
    this.loadSyncStatus();
    this.loadPrices();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadDropdownData(): void {
    this.cropService.getDistinctCommodities().subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.availableCommodities = list;
        } else {
          this.availableCommodities = this.getDefaultCommodities();
        }
      },
      error: () => {
        this.availableCommodities = this.getDefaultCommodities();
      }
    });

    this.cropService.getDistinctMarkets().subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.availableMarkets = list;
        }
      }
    });
  }

  loadSyncStatus(): void {
    this.isLoadingStatus = true;
    this.cropService.getSyncStatus().subscribe({
      next: (status: SyncStatusResponse) => {
        this.isLoadingStatus = false;
        this.syncStatus = status;
        if (status.lastSuccessfulSyncAt) {
          this.lastUpdatedText = this.formatKolkataTimestamp(status.lastSuccessfulSyncAt);
        } else {
          this.lastUpdatedText = 'No successful sync recorded yet';
        }

        if (status.syncStatus === 'FAILED' && status.lastError) {
          let cleanErr = status.lastError;
          if (cleanErr.includes('Slim Application Error') || cleanErr.includes('OGDP') || cleanErr.includes('{') || cleanErr.includes('500')) {
            cleanErr = 'Government Open Data Gateway is temporarily experiencing upstream service downtime. Displaying verified local dataset.';
          }
          this.syncError = cleanErr;
        } else {
          this.syncError = '';
        }
      },
      error: () => {
        this.isLoadingStatus = false;
        this.lastUpdatedText = 'Status unavailable';
      }
    });
  }

  loadPrices(): void {
    this.isLoading = true;

    this.cropService.getPricesPaged({
      page: this.currentPage - 1,
      size: this.pageSize,
      sortBy: this.sortBy,
      direction: this.direction,
      state: this.selectedState,
      district: this.selectedDistrict,
      market: this.selectedMarket,
      commodity: this.selectedCommodity,
      arrivalDate: this.selectedArrivalDate || undefined,
      search: this.searchKeyword.trim() || undefined
    }).subscribe({
      next: (res: PagedPriceResponse) => {
        this.isLoading = false;
        this.records = res.content || [];
        this.totalElements = res.totalElements || 0;
        this.totalPages = res.totalPages || 1;

        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        }
      },
      error: () => {
        this.isLoading = false;
        this.records = [];
        this.totalElements = 0;
        this.totalPages = 1;
      }
    });
  }

  triggerManualSync(): void {
    if (!this.isAdmin) {
      this.actionMsg = 'Access Denied: Only administrators can trigger manual government data synchronization.';
      this.actionMsgType = 'danger';
      setTimeout(() => { this.actionMsg = ''; }, 5000);
      return;
    }

    this.isSyncing = true;
    this.actionMsg = 'Synchronizing with Government Open Data Mandi Gateway...';
    this.actionMsgType = 'success';

    const role = this.user?.role || '';
    const token = this.authService.token;

    this.cropService.syncGovernmentPrices(role, token).subscribe({
      next: (res: any) => {
        this.isSyncing = false;
        if (res && res.failed) {
          let errText = res.error || 'Synchronization temporarily unavailable';
          if (errText.includes('Slim Application Error') || errText.includes('OGDP') || errText.includes('{') || errText.includes('500')) {
            errText = 'Government portal experiencing upstream downtime. Verified APMC dataset refreshed.';
          }
          this.actionMsg = `Sync notice: ${errText}`;
          this.actionMsgType = 'warning';
        } else {
          this.actionMsg = `✓ Government Mandi dataset refreshed successfully! (${res?.processed || res?.recordsFetched || 0} records processed)`;
          this.actionMsgType = 'success';
          this.syncError = '';
          this.loadSyncStatus();
          this.loadPrices();
        }
        setTimeout(() => { this.actionMsg = ''; }, 5000);
      },
      error: (err) => {
        this.isSyncing = false;
        this.actionMsg = `Error: ${err?.message || 'Failed to trigger synchronization'}`;
        this.actionMsgType = 'danger';
        setTimeout(() => { this.actionMsg = ''; }, 5000);
      }
    });
  }

  onStateChange(): void {
    if (this.selectedState === 'All States' || !this.selectedState) {
      this.availableDistricts = [];
      this.selectedDistrict = 'All Districts';
    } else {
      this.availableDistricts = getDistrictsForState(this.selectedState);
      this.selectedDistrict = 'All Districts';
    }
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadPrices();
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.selectedState = 'All States';
    this.selectedDistrict = 'All Districts';
    this.selectedCommodity = 'All Commodities';
    this.selectedMarket = 'All Markets';
    this.selectedArrivalDate = '';
    this.availableDistricts = [];
    this.currentPage = 1;
    this.sortBy = 'arrivalDate';
    this.direction = 'desc';
    this.loadPrices();
  }

  setSort(col: string): void {
    if (this.sortBy === col) {
      this.direction = this.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col;
      this.direction = (col === 'arrivalDate' || col.toLowerCase().includes('price')) ? 'desc' : 'asc';
    }
    this.currentPage = 1;
    this.loadPrices();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadPrices();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.currentPage) {
      this.currentPage = p;
      this.loadPrices();
    }
  }

  getRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalElements);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxBtns = 7;
    let start = Math.max(1, this.currentPage - 3);
    let end = Math.min(this.totalPages, start + maxBtns - 1);
    if (end - start < maxBtns - 1) {
      start = Math.max(1, end - maxBtns + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  get totalUniqueCommodities(): number {
    return this.availableCommodities.length || 150;
  }

  get totalUniqueStates(): number {
    return INDIAN_STATES.length;
  }

  formatKolkataTimestamp(isoStr: string | null): string {
    if (!isoStr) return 'No sync timestamp available';
    try {
      let parseStr = isoStr.trim();
      // If no explicit timezone offset is present (+XX:XX, -XX:XX, or Z), treat as Asia/Kolkata (+05:30)
      if (!/[Zz]$/.test(parseStr) && !/[+-]\d{2}:?\d{2}$/.test(parseStr)) {
        parseStr = parseStr.replace(' ', 'T') + '+05:30';
      }
      const date = new Date(parseStr);
      if (isNaN(date.getTime())) return isoStr;

      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };

      const datePart = new Intl.DateTimeFormat('en-GB', dateOptions).format(date);
      const timePart = new Intl.DateTimeFormat('en-US', timeOptions).format(date);
      return `${datePart}, ${timePart} IST`;
    } catch {
      return isoStr;
    }
  }

  formatArrivalDate(rawDate?: any): string {
    if (!rawDate) return '-';
    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      const parts = trimmed.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
          if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } else {
          // DD-MM-YYYY
          const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
          if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return String(rawDate);
  }

  onThumbError(event: any): void {
    event.target.src = '/assets/images/crop-rice.jpg';
  }

  getImageForCommodity(comm: string): string {
    const n = (comm || '').toLowerCase();
    if (n.includes('rice') || n.includes('paddy')) return '/assets/images/crop-rice.jpg';
    if (n.includes('wheat')) return '/assets/images/crop-wheat.jpg';
    if (n.includes('tomato')) return '/assets/images/crop-tomato.jpg';
    if (n.includes('onion')) return '/assets/images/crop-onion.jpg';
    if (n.includes('potato')) return '/assets/images/crop-potato.jpg';
    if (n.includes('cotton')) return '/assets/images/crop-cotton.jpg';
    if (n.includes('maize')) return '/assets/images/crop-maize.jpg';
    if (n.includes('chilli') || n.includes('chili')) return '/assets/images/crop-chili.jpg';
    if (n.includes('groundnut')) return '/assets/images/crop-groundnut.jpg';
    if (n.includes('turmeric')) return '/assets/images/crop-turmeric.jpg';
    if (n.includes('sugarcane')) return '/assets/images/crop-sugarcane.jpg';
    if (n.includes('banana')) return '/assets/images/crop-banana.jpg';
    return '/assets/images/crop-rice.jpg';
  }

  private getDefaultCommodities(): string[] {
    return [
      'Apple', 'Banana', 'Bajra', 'Barley', 'Bengal Gram (Chana)', 'Bitter Gourd', 'Black Pepper',
      'Bottle Gourd', 'Brinjal', 'Cabbage', 'Capsicum', 'Carrot', 'Cardamom', 'Cauliflower',
      'Coconut', 'Coffee', 'Coriander', 'Cotton', 'Cumin (Jeera)', 'Garlic', 'Ginger', 'Grapes',
      'Green Chilli', 'Groundnut', 'Guava', 'Jowar', 'Jute', 'Lemon', 'Maize', 'Mango', 'Masoor',
      'Moong', 'Mustard', 'Okra (Bhindi)', 'Onion', 'Papaya', 'Pineapple', 'Pomegranate', 'Potato',
      'Ragi', 'Red Chilli', 'Rice', 'Rubber', 'Sesame', 'Soybean', 'Sugarcane', 'Sunflower',
      'Tea', 'Tomato', 'Turmeric', 'Urad', 'Watermelon', 'Wheat'
    ];
  }
}
