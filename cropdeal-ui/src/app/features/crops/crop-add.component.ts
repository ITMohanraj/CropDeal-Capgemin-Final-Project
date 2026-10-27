import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CropService } from '../../core/services/crop.service';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { Crop, PriceRecommendationRequest, PriceRecommendationResponse } from '../../core/models/crop.model';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of, Subject, Subscription } from 'rxjs';
import { resolveCropImage } from '../../core/utils/crop-image.util';

interface MandiPriceBenchmark {
  commodity: string;
  category: string;
  modalPricePerKg: number;
  minPricePerKg: number;
  maxPricePerKg: number;
  market: string;
  state: string;
  variety?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-crop-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="add-crop-container">
      <div class="card add-card">
        <div class="card-header">
          <div>
            <h2 class="form-title"><i class="fa-solid fa-circle-plus text-emerald"></i> List Your Fresh Harvest</h2>
            <p class="form-subtitle">Sell directly to commercial dealers. Automatic location-based Mandi prices keep your harvest competitive.</p>
          </div>
          <a routerLink="/crops" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-arrow-left"></i> Back to Market
          </a>
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          <i class="fa-solid fa-circle-check"></i>
          <span>{{ successMessage }}</span>
        </div>
        <div *ngIf="errorMessage" class="alert alert-danger">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Quick Select Commodity Chips -->
        <div class="quick-chips-section">
          <label class="section-label">
            <i class="fa-solid fa-bolt text-amber"></i> Quick Select Commodity to Check Mandhi Price:
          </label>
          <div class="chips-wrap">
            <button
              *ngFor="let item of popularCommodities"
              type="button"
              class="commodity-chip"
              [class.active]="crop.cropName === item.commodity"
              (click)="selectCommodity(item)">
              <span>{{ item.commodity }}</span>
              <strong class="chip-price">₹{{ item.modalPricePerKg }}/Kg</strong>
            </button>
          </div>
        </div>

        <form (ngSubmit)="onSubmit()" class="crop-form">
          <div class="grid grid-cols-2">
            <div class="form-group">
              <label class="form-label">Crop / Commodity Name *</label>
              <input
                type="text"
                [(ngModel)]="crop.cropName"
                (ngModelChange)="onCropNameInput($event)"
                name="cropName"
                list="commodityList"
                placeholder="e.g. Wheat, Tomato, Paddy, Onion, Banana..."
                class="form-control"
                required />
              <datalist id="commodityList">
                <option *ngFor="let p of allGovPrices" [value]="p.commodity">{{ p.commodity }} - Govt Benchmark Rate: ₹{{ p.modalPricePerKg }}/Kg</option>
              </datalist>
              <small class="field-hint">Type or select a crop to automatically calculate location-matched mandi rates.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Crop Category *</label>
              <select [(ngModel)]="crop.cropType" name="cropType" class="form-control" required>
                <option value="Grains">Grains & Cereals</option>
                <option value="Pulses">Pulses & Legumes</option>
                <option value="Oilseeds">Oilseeds</option>
                <option value="Spices">Spices</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Commercial">Commercial Crops</option>
              </select>
            </div>
          </div>

          <!-- Location Selector with GPS & State/District Dropdowns -->
          <div class="location-box">
            <div class="location-box-header">
              <label class="form-label mb-0">
                <i class="fa-solid fa-map-location-dot text-emerald"></i> Farmer Crop & Mandi Location *
              </label>
              <button
                type="button"
                class="btn-gps"
                (click)="useCurrentLocation()"
                [disabled]="isDetectingLocation"
                title="Detect GPS coordinates">
                <i class="fa-solid fa-crosshairs" [class.fa-spin]="isDetectingLocation"></i>
                <span>{{ isDetectingLocation ? 'Detecting GPS...' : 'Use Current GPS Location' }}</span>
              </button>
            </div>

            <div *ngIf="locationDetectMessage" class="gps-feedback" [class.error]="locationDetectMessage.includes('denied') || locationDetectMessage.includes('unavailable')">
              <i class="fa-solid fa-location-arrow"></i> {{ locationDetectMessage }}
            </div>

            <div class="grid grid-cols-3 mt-2">
              <div class="form-group">
                <label class="sub-label">State</label>
                <select
                  [(ngModel)]="selectedState"
                  (ngModelChange)="onStateChange($event)"
                  name="selectedState"
                  class="form-control form-control-sm">
                  <option value="">-- Select State --</option>
                  <option *ngFor="let s of availableStates" [value]="s">{{ s }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="sub-label">District</label>
                <select
                  [(ngModel)]="selectedDistrict"
                  (ngModelChange)="onDistrictChange($event)"
                  name="selectedDistrict"
                  [disabled]="!selectedState"
                  class="form-control form-control-sm">
                  <option value="">-- Select District --</option>
                  <option *ngFor="let d of availableDistricts" [value]="d">{{ d }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="sub-label">Mandi / Farm Address *</label>
                <input
                  type="text"
                  [(ngModel)]="crop.location"
                  (ngModelChange)="onLocationInput($event)"
                  name="location"
                  placeholder="e.g. Karnal Mandi, Haryana"
                  class="form-control form-control-sm"
                  required />
              </div>
            </div>
            <small class="field-hint text-xs">
              <i class="fa-solid fa-shield-halved text-emerald"></i> Mandi price is dynamically matched using your District, Nearest Mandi (Haversine formula), or GPS coordinates.
            </small>
          </div>

          <!-- PROMINENT INTELLIGENT SUGGESTED MANDI PRICE CARD -->
          <div class="gov-mandhi-card shadow-sm" *ngIf="recommendation || matchedGovPrice">
            <div class="gov-card-badge">
              <div class="badge-title">
                <i class="fa-solid fa-building-columns"></i>
                <span>Suggested Mandi Price (Government APMC Benchmark)</span>
              </div>
              <!-- Match Type Badges: SAME_DISTRICT, NEAREST_MARKET, REGIONAL_ESTIMATE, NO_DATA -->
              <span class="badge-tag" [ngClass]="getMatchBadgeClass()">
                <i [class]="getMatchBadgeIcon()"></i>
                <span>{{ recommendation?.matchTypeLabel || 'APMC Benchmark' }}</span>
              </span>
            </div>

            <div class="gov-card-grid">
              <div class="gov-price-box">
                <span class="box-lbl">Recommended Mandi Rate</span>
                <div class="box-rate">
                  <ng-container *ngIf="recommendation?.recommendedPricePerKg !== null && recommendation?.recommendedPricePerKg !== undefined">
                    <span class="currency">₹</span>
                    <span class="value">{{ recommendation?.recommendedPricePerKg | number:'1.2-2' }}</span>
                    <span class="per-unit">/ Kg</span>
                  </ng-container>
                  <ng-container *ngIf="recommendation?.matchType === 'NO_DATA'">
                    <span class="value text-muted" style="font-size: 1.5rem;">N/A</span>
                  </ng-container>
                </div>
                <span class="box-sub" *ngIf="recommendation?.matchType !== 'NO_DATA'">
                  {{ recommendation?.matchType === 'SAME_DISTRICT' ? 'Official District Modal Rate' : (recommendation?.distanceKm ? (recommendation?.distanceKm + ' km away') : 'APMC Modal Rate') }}
                </span>
                <span class="box-sub text-muted" *ngIf="recommendation?.matchType === 'NO_DATA'">
                  No Gov Mandi Rate Available
                </span>

                <!-- 1-Click Apply Rate Button -->
                <button
                  *ngIf="recommendation?.recommendedPricePerKg"
                  type="button"
                  class="btn-apply-rate mt-2"
                  (click)="applyRecommendedRate()"
                  title="Copy recommended price to selling price input">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  <span>Apply Rate (₹{{ recommendation?.recommendedPricePerKg | number:'1.2-2' }}/Kg)</span>
                </button>
              </div>

              <div class="gov-market-details">
                <div class="detail-line">
                  <span class="d-label">Commodity:</span>
                  <strong class="d-val">{{ recommendation?.commodity || crop.cropName }}</strong>
                </div>
                <div class="detail-line" *ngIf="recommendation?.sourceMarket || recommendation?.sourceDistrict">
                  <span class="d-label">Source Mandi:</span>
                  <span class="d-val font-semibold">
                    {{ recommendation?.sourceMarket || recommendation?.sourceDistrict }}
                    ({{ recommendation?.sourceDistrict ? recommendation?.sourceDistrict + ', ' : '' }}{{ recommendation?.sourceState }})
                  </span>
                </div>
                <div class="detail-line" *ngIf="recommendation?.distanceKm !== null && recommendation?.distanceKm !== undefined">
                  <span class="d-label">Geographic Distance:</span>
                  <span class="d-val text-primary font-semibold">
                    <i class="fa-solid fa-route"></i> {{ recommendation?.distanceKm }} km away
                  </span>
                </div>
                <div class="detail-line" *ngIf="recommendation?.sourceArrivalDate">
                  <span class="d-label">Source Arrival Date:</span>
                  <span class="d-val">{{ recommendation?.sourceArrivalDate }}</span>
                </div>
                <div class="detail-line" *ngIf="recommendation?.minPricePerKg && recommendation?.maxPricePerKg">
                  <span class="d-label">Government Price Range:</span>
                  <span class="d-val">₹{{ recommendation?.minPricePerKg }} - ₹{{ recommendation?.maxPricePerKg }} / Kg</span>
                </div>
                <div class="detail-line text-emerald font-semibold" *ngIf="recommendation?.recommendedPricePerKg">
                  <span class="d-label">Ceiling Benchmark:</span>
                  <strong class="d-val text-emerald">&le; ₹{{ recommendation?.recommendedPricePerKg | number:'1.2-2' }} / Kg</strong>
                </div>
                <div class="detail-line" *ngIf="recommendation?.message">
                  <span class="d-label">Engine Note:</span>
                  <span class="d-val text-xs text-muted">{{ recommendation?.message }}</span>
                </div>
              </div>
            </div>

            <!-- Validation Feedback Banner inside Mandhi Card -->
            <div class="gov-validation-bar" [ngClass]="getValidationStatusClass()">
              <ng-container *ngIf="recommendation?.matchType === 'NO_DATA'">
                <i class="fa-solid fa-circle-info"></i>
                <span>No government mandi records were found for <strong>{{ crop.cropName }}</strong> in this area. You can enter your expected selling price below without restriction.</span>
              </ng-container>
              <ng-container *ngIf="recommendation?.matchType !== 'NO_DATA' && !crop.pricePerUnit">
                <i class="fa-solid fa-circle-info"></i>
                <span>Please enter your expected selling price below. Recommended rate is <strong>₹{{ (recommendation?.recommendedPricePerKg || matchedGovPrice?.modalPricePerKg) | number:'1.2-2' }} / Kg</strong>.</span>
              </ng-container>
              <ng-container *ngIf="recommendation?.matchType !== 'NO_DATA' && crop.pricePerUnit && isPriceHigherThanGov()">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>
                  <strong>Price Alert:</strong> ₹{{ crop.pricePerUnit }}/Kg exceeds the suggested Mandi benchmark of ₹{{ (recommendation?.recommendedPricePerKg || matchedGovPrice?.modalPricePerKg) | number:'1.2-2' }}/Kg.
                  Please specify an amount <strong>less than or equal to ₹{{ (recommendation?.recommendedPricePerKg || matchedGovPrice?.modalPricePerKg) | number:'1.2-2' }}/Kg</strong> to ensure fair competitive trading.
                </span>
              </ng-container>
              <ng-container *ngIf="recommendation?.matchType !== 'NO_DATA' && crop.pricePerUnit && !isPriceHigherThanGov()">
                <i class="fa-solid fa-circle-check"></i>
                <span>
                  <strong>Approved!</strong> Your price of ₹{{ crop.pricePerUnit }}/Kg is within or lower than the suggested Mandi rate (₹{{ (recommendation?.recommendedPricePerKg || matchedGovPrice?.modalPricePerKg) | number:'1.2-2' }}/Kg).
                  Commercial dealers save ₹{{ ((recommendation?.recommendedPricePerKg || matchedGovPrice?.modalPricePerKg || 0) - (crop.pricePerUnit || 0)) | number:'1.2-2' }}/Kg!
                </span>
              </ng-container>
            </div>
          </div>

          <div class="grid grid-cols-3">
            <div class="form-group">
              <label class="form-label">Quantity Available *</label>
              <input type="number" [(ngModel)]="crop.quantity" name="quantity" min="1" placeholder="e.g. 500" class="form-control" required />
            </div>

            <div class="form-group">
              <label class="form-label">Measurement Unit *</label>
              <select [(ngModel)]="crop.unit" name="unit" class="form-control" required>
                <option value="Kg">Kilogram (Kg)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">
                Farmer Selling Price (₹ / Kg) *
              </label>
              <div class="input-with-icon">
                <span class="input-prefix">₹</span>
                <input
                  type="number"
                  [(ngModel)]="crop.pricePerUnit"
                  (ngModelChange)="onPriceChange()"
                  name="pricePerUnit"
                  min="0.5"
                  step="0.5"
                  [placeholder]="getPlaceholderPrice()"
                  class="form-control"
                  [class.is-invalid]="crop.pricePerUnit && isPriceHigherThanGov()"
                  [class.is-valid]="crop.pricePerUnit && !isPriceHigherThanGov()"
                  required />
              </div>
              <small *ngIf="recommendation?.matchType !== 'NO_DATA' && matchedGovPrice && isPriceHigherThanGov()" class="text-danger font-semibold mt-1 d-block">
                Must be less than or equal to ₹{{ matchedGovPrice.modalPricePerKg }}/Kg
              </small>
              <small *ngIf="recommendation?.matchType !== 'NO_DATA' && matchedGovPrice && !isPriceHigherThanGov() && crop.pricePerUnit" class="text-success font-semibold mt-1 d-block">
                ✓ Valid rate: equal to or lower than suggested Mandi rate
              </small>
            </div>
          </div>

          <div class="grid grid-cols-1">
            <div class="form-group">
              <label class="form-label">
                <i class="fa-solid fa-cloud-arrow-up text-emerald"></i> Produce Image (Upload from Device / Cloudinary)
              </label>
              <div class="image-upload-wrapper">
                <input
                  type="file"
                  id="cropFileInput"
                  (change)="onFileSelected($event)"
                  accept="image/*"
                  class="d-none" />
                <label for="cropFileInput" class="btn-file-select" [class.uploading]="isUploadingImage">
                  <i class="fa-solid fa-cloud-arrow-up" *ngIf="!isUploadingImage"></i>
                  <i class="fa-solid fa-spinner fa-spin text-emerald" *ngIf="isUploadingImage"></i>
                  <span>{{ isUploadingImage ? 'Uploading to Cloudinary...' : (selectedFile ? 'Change Image (' + selectedFile.name + ')' : 'Choose Image from Machine') }}</span>
                </label>

                <!-- Cloudinary Preview Card -->
                <div *ngIf="crop.imageUrl || selectedImagePreview" class="image-preview-card mt-2">
                  <img
                    [src]="crop.imageUrl || selectedImagePreview"
                    alt="Produce preview"
                    class="produce-preview-thumb"
                    (error)="onPreviewError($event)" />
                  <div class="preview-info">
                    <span class="preview-title">{{ selectedFile ? selectedFile.name : (crop.cropName || 'Crop Produce') }}</span>
                    <span class="badge-cloud" *ngIf="cloudinaryUploadedUrl || (crop.imageUrl && crop.imageUrl.includes('cloudinary'))">
                      <i class="fa-solid fa-cloud-bolt text-emerald"></i> Hosted on Cloudinary
                    </span>
                    <span class="badge-ready" *ngIf="!cloudinaryUploadedUrl && (!crop.imageUrl || !crop.imageUrl.includes('cloudinary'))">
                      <i class="fa-solid fa-image text-primary"></i> Ready for Upload
                    </span>
                  </div>
                </div>

                <!-- URL text input option -->
                <div class="mt-2">
                  <input
                    type="url"
                    [(ngModel)]="crop.imageUrl"
                    name="imageUrl"
                    placeholder="Or paste Cloud/Web Image URL (optional)"
                    class="form-control form-control-sm text-xs" />
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Harvest Quality & Soil / Organic Details</label>
            <textarea [(ngModel)]="crop.description" name="description" rows="3" class="form-control" placeholder="Describe variety grade, moisture level, organic certification, pesticide treatment..."></textarea>
          </div>

          <div class="form-actions mt-4">
            <button type="button" routerLink="/crops" class="btn btn-secondary">Cancel</button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="submitting || (recommendation?.matchType !== 'NO_DATA' && matchedGovPrice && isPriceHigherThanGov())">
              <i class="fa-solid fa-paper-plane"></i>
              {{ submitting ? 'Publishing Crop...' : 'Publish Harvest to Marketplace' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .add-crop-container {
      max-width: 920px;
      margin: 0 auto;
    }
    .form-title { font-size: 1.4rem; font-weight: 800; color: var(--text-main, #0f172a); }
    .form-subtitle { font-size: 0.85rem; color: var(--text-muted, #64748b); margin-top: 0.2rem; }
    .text-emerald { color: #15803d; }
    .text-amber { color: #d97706; }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }
    .text-primary { color: #2563eb; }
    .font-semibold { font-weight: 600; }
    .d-block { display: block; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mb-0 { margin-bottom: 0 !important; }
    .text-xs { font-size: 0.75rem; }

    /* Quick Chips */
    .quick-chips-section {
      margin-top: 1.25rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1rem;
    }
    .section-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.65rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .chips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .commodity-chip {
      background: white;
      border: 1px solid #cbd5e1;
      padding: 0.4rem 0.75rem;
      border-radius: 2rem;
      font-size: 0.8rem;
      color: #1e293b;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.15s ease-in-out;
    }
    .commodity-chip:hover {
      border-color: #15803d;
      background: #f0fdf4;
      color: #15803d;
      transform: translateY(-1px);
    }
    .commodity-chip.active {
      background: #15803d;
      border-color: #15803d;
      color: white;
    }
    .commodity-chip.active .chip-price {
      background: rgba(255, 255, 255, 0.25);
      color: white;
    }
    .chip-price {
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: 1rem;
      font-size: 0.72rem;
      color: #15803d;
      font-weight: 700;
    }

    /* Location Selection Box */
    .location-box {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      margin: 0.75rem 0;
    }
    .location-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .btn-gps {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      border-radius: 2rem;
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s ease;
    }
    .btn-gps:hover:not(:disabled) {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .btn-gps:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .gps-feedback {
      font-size: 0.75rem;
      margin-top: 0.35rem;
      color: #15803d;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .gps-feedback.error {
      color: #dc2626;
    }
    .sub-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      margin-bottom: 0.25rem;
      display: block;
    }

    /* Government Mandhi Price Card */
    .gov-mandhi-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      border: 1.5px solid #86efac;
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 0.5rem 0;
    }
    .gov-card-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px dashed #bbf7d0;
      padding-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .badge-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 800;
      color: #166534;
      font-size: 0.9rem;
    }
    .badge-tag {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 1rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .badge-tag-district {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .badge-tag-nearest {
      background: #dbeafe;
      color: #1d4ed8;
      border: 1px solid #93c5fd;
    }
    .badge-tag-regional {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fcd34d;
    }
    .badge-tag-nodata {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #cbd5e1;
    }

    .gov-card-grid {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1.5rem;
      align-items: center;
    }
    @media (max-width: 680px) {
      .gov-card-grid { grid-template-columns: 1fr; }
    }
    .gov-price-box {
      background: white;
      border: 1px solid #86efac;
      border-radius: 0.65rem;
      padding: 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 2px 4px rgba(22, 101, 52, 0.05);
    }
    .box-lbl { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .box-rate {
      display: flex;
      align-items: baseline;
      gap: 0.15rem;
      color: #15803d;
      margin: 0.25rem 0;
    }
    .box-rate .currency { font-size: 1.3rem; font-weight: 800; }
    .box-rate .value { font-size: 2.2rem; font-weight: 900; line-height: 1; }
    .box-rate .per-unit { font-size: 0.85rem; font-weight: 700; color: #64748b; margin-left: 0.2rem; }
    .box-sub { font-size: 0.72rem; color: #16a34a; font-weight: 600; }

    .btn-apply-rate {
      background: #15803d;
      color: white;
      border: none;
      border-radius: 0.4rem;
      padding: 0.35rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: background 0.15s ease;
      width: 100%;
      justify-content: center;
    }
    .btn-apply-rate:hover {
      background: #166534;
    }

    .gov-market-details {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.825rem;
    }
    .detail-line {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.25rem;
    }
    .d-label { color: #64748b; }
    .d-val { color: #1e293b; font-weight: 600; }

    .gov-validation-bar {
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.825rem;
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      line-height: 1.4;
    }
    .gov-validation-bar.neutral {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
    }
    .gov-validation-bar.violated {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }
    .gov-validation-bar.valid {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }

    /* Image upload */
    .image-upload-wrapper {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 0.5rem;
      padding: 0.75rem;
    }
    .btn-file-select {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .btn-file-select:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .image-preview-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.4rem;
    }
    .produce-preview-thumb {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 0.3rem;
      border: 1px solid #cbd5e1;
    }
    .preview-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .preview-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #1e293b;
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
  `]
})
export class CropAddComponent implements OnInit, OnDestroy {
  crop: Partial<Crop> = {
    cropName: '',
    cropType: 'Grains',
    quantity: 500,
    unit: 'Kg',
    pricePerUnit: undefined,
    location: '',
    description: '',
    imageUrl: '',
    status: 'AVAILABLE'
  };

  submitting = false;
  successMessage = '';
  errorMessage = '';

  // Location selector state
  availableStates: string[] = [];
  availableDistricts: string[] = [];
  selectedState = '';
  selectedDistrict = '';
  latitude: number | null = null;
  longitude: number | null = null;
  isDetectingLocation = false;
  locationDetectMessage = '';

  // Recommendation state
  recommendation: PriceRecommendationResponse | null = null;
  isLoadingRecommendation = false;
  private inputSubject = new Subject<void>();
  private inputSub?: Subscription;

  // Cloudinary image upload state
  selectedFile: File | null = null;
  selectedImagePreview: string | null = null;
  isUploadingImage = false;
  cloudinaryUploadedUrl: string | null = null;

  // Government Mandhi Prices benchmarks
  matchedGovPrice: MandiPriceBenchmark | null = null;
  allGovPrices: MandiPriceBenchmark[] = [];
  popularCommodities: MandiPriceBenchmark[] = [];

  private defaultBenchmarks: MandiPriceBenchmark[] = [
    { commodity: 'Wheat', category: 'Grains', modalPricePerKg: 25.00, minPricePerKg: 23.00, maxPricePerKg: 26.00, market: 'Khanna Mandi', state: 'Punjab', imageUrl: '/assets/images/crop-wheat.jpg' },
    { commodity: 'Paddy (Rice)', category: 'Grains', modalPricePerKg: 20.00, minPricePerKg: 19.00, maxPricePerKg: 21.00, market: 'Coimbatore Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-rice.jpg' },
    { commodity: 'Maize', category: 'Grains', modalPricePerKg: 21.00, minPricePerKg: 19.00, maxPricePerKg: 23.00, market: 'Namakkal Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-maize.jpg' },
    { commodity: 'Tomato', category: 'Vegetables', modalPricePerKg: 26.00, minPricePerKg: 25.00, maxPricePerKg: 28.00, market: 'Erode Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-tomato.jpg' },
    { commodity: 'Onion', category: 'Vegetables', modalPricePerKg: 61.00, minPricePerKg: 59.00, maxPricePerKg: 64.00, market: 'Erode Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-onion.jpg' },
    { commodity: 'Potato', category: 'Vegetables', modalPricePerKg: 39.00, minPricePerKg: 37.00, maxPricePerKg: 41.00, market: 'Erode Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-potato.jpg' },
    { commodity: 'Cotton', category: 'Commercial', modalPricePerKg: 72.00, minPricePerKg: 68.00, maxPricePerKg: 75.00, market: 'Gondal Mandi', state: 'Gujarat', imageUrl: '/assets/images/crop-cotton.jpg' },
    { commodity: 'Groundnut', category: 'Oilseeds', modalPricePerKg: 56.00, minPricePerKg: 52.00, maxPricePerKg: 59.00, market: 'Erode Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-groundnut.jpg' },
    { commodity: 'Turmeric', category: 'Spices', modalPricePerKg: 102.00, minPricePerKg: 95.00, maxPricePerKg: 110.00, market: 'Erode Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-turmeric.jpg' },
    { commodity: 'Sugarcane', category: 'Commercial', modalPricePerKg: 4.00, minPricePerKg: 3.50, maxPricePerKg: 4.00, market: 'Meerut Mandi', state: 'Uttar Pradesh', imageUrl: '/assets/images/crop-sugarcane.jpg' },
    { commodity: 'Banana', category: 'Fruits', modalPricePerKg: 14.00, minPricePerKg: 12.00, maxPricePerKg: 16.00, market: 'Trichy Yard', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-banana.jpg' },
    { commodity: 'Red Chilli', category: 'Spices', modalPricePerKg: 132.00, minPricePerKg: 120.00, maxPricePerKg: 145.00, market: 'Madurai Mandi', state: 'Tamil Nadu', imageUrl: '/assets/images/crop-chili.jpg' }
  ];

  constructor(
    private cropService: CropService,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.crop.farmerId = user.id || user.userId || 'farmer-1';
      this.crop.farmerName = user.fullName || user.username;
      const initialLoc = user.address || 'Karnal Mandi, Haryana';
      this.crop.location = initialLoc;
      this.extractStateAndDistrictFromLocation(initialLoc);
    }

    this.loadDistinctStates();
    this.initGovPrices();

    // Debounced listener for price recommendation
    this.inputSub = this.inputSubject.pipe(
      debounceTime(250)
    ).subscribe(() => {
      this.fetchPriceRecommendation();
    });
  }

  ngOnDestroy(): void {
    if (this.inputSub) {
      this.inputSub.unsubscribe();
    }
  }

  loadDistinctStates(): void {
    this.cropService.getDistinctStates().subscribe({
      next: (states) => {
        if (states && states.length > 0) {
          this.availableStates = states;
        } else {
          this.availableStates = [
            'Haryana', 'Punjab', 'Tamil Nadu', 'Uttar Pradesh', 'Rajasthan',
            'Madhya Pradesh', 'Maharashtra', 'Gujarat', 'Karnataka', 'Andhra Pradesh',
            'Telangana', 'Kerala', 'Bihar', 'West Bengal', 'Uttarakhand'
          ];
        }
        if (this.selectedState) {
          this.loadDistricts(this.selectedState);
        }
      },
      error: () => {
        this.availableStates = ['Haryana', 'Punjab', 'Tamil Nadu', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Gujarat', 'Karnataka'];
      }
    });
  }

  loadDistricts(state: string): void {
    if (!state) {
      this.availableDistricts = [];
      return;
    }
    this.cropService.getDistinctDistricts(state).subscribe({
      next: (districts) => {
        this.availableDistricts = districts || [];
      }
    });
  }

  onStateChange(state: string): void {
    this.selectedState = state;
    this.selectedDistrict = '';
    this.loadDistricts(state);
    if (state) {
      this.crop.location = state;
    }
    this.triggerRecommendation();
  }

  onDistrictChange(district: string): void {
    this.selectedDistrict = district;
    if (district && this.selectedState) {
      this.crop.location = `${district}, ${this.selectedState}`;
    }
    this.triggerRecommendation();
  }

  onLocationInput(val: string): void {
    if (val) {
      this.extractStateAndDistrictFromLocation(val);
    }
    this.triggerRecommendation();
  }

  useCurrentLocation(): void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.locationDetectMessage = 'GPS Geolocation is not supported by your browser.';
      return;
    }

    this.isDetectingLocation = true;
    this.locationDetectMessage = 'Querying device GPS...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isDetectingLocation = false;
        this.latitude = pos.coords.latitude;
        this.longitude = pos.coords.longitude;
        this.locationDetectMessage = `Detected GPS: ${this.latitude.toFixed(4)}, ${this.longitude.toFixed(4)}`;
        this.triggerRecommendation();
      },
      (err) => {
        this.isDetectingLocation = false;
        this.locationDetectMessage = `Location access denied or unavailable (${err.message}). Manual entry remains available.`;
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  private extractStateAndDistrictFromLocation(loc: string): void {
    if (!loc) return;
    const parts = loc.split(/[,;\-]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      this.selectedState = parts[parts.length - 1];
      this.selectedDistrict = parts[parts.length - 2].replace(/\b(mandi|apmc|yard)\b/gi, '').trim();
      this.loadDistricts(this.selectedState);
    } else if (parts.length === 1) {
      this.selectedState = parts[0];
    }
  }

  initGovPrices(): void {
    this.allGovPrices = [...this.defaultBenchmarks];
    this.popularCommodities = this.defaultBenchmarks.slice(0, 10);

    // Initial check
    this.triggerRecommendation();
  }

  triggerRecommendation(): void {
    this.inputSubject.next();
  }

  fetchPriceRecommendation(): void {
    if (!this.crop.cropName || !this.crop.cropName.trim()) {
      this.recommendation = null;
      this.matchedGovPrice = null;
      return;
    }

    this.isLoadingRecommendation = true;
    const req: PriceRecommendationRequest = {
      commodity: this.crop.cropName.trim(),
      state: this.selectedState || undefined,
      district: this.selectedDistrict || undefined,
      location: this.crop.location || undefined,
      latitude: this.latitude || undefined,
      longitude: this.longitude || undefined
    };

    this.cropService.getPriceRecommendation(req).subscribe({
      next: (res) => {
        this.isLoadingRecommendation = false;
        this.recommendation = res;

        // Auto-sync state and district if returned by recommendation engine
        if (res.sourceState && !this.selectedState) {
          this.selectedState = res.sourceState;
          this.loadDistricts(res.sourceState);
        }
        if (res.sourceDistrict && !this.selectedDistrict) {
          this.selectedDistrict = res.sourceDistrict;
        }

        if (res.matchType !== 'NO_DATA' && res.recommendedPricePerKg !== null && res.recommendedPricePerKg !== undefined) {
          this.matchedGovPrice = {
            commodity: res.commodity,
            category: this.mapCategory(res.commodity),
            modalPricePerKg: res.recommendedPricePerKg,
            minPricePerKg: res.minPricePerKg || res.recommendedPricePerKg * 0.9,
            maxPricePerKg: res.maxPricePerKg || res.recommendedPricePerKg * 1.1,
            market: res.sourceMarket || res.sourceDistrict || 'APMC Mandi',
            state: res.sourceState || 'India'
          };

          // If no selling price is entered yet, suggest slightly below the mandi ceiling
          if (!this.crop.pricePerUnit) {
            this.crop.pricePerUnit = Math.max(1, Math.round((res.recommendedPricePerKg - 0.5) * 10) / 10);
          }
        } else {
          // NO_DATA: Farmer is free to set any selling price
          this.matchedGovPrice = null;
        }

        this.onPriceChange();
      },
      error: () => {
        this.isLoadingRecommendation = false;
      }
    });
  }

  applyRecommendedRate(): void {
    const rate = this.recommendation?.recommendedPricePerKg || this.matchedGovPrice?.modalPricePerKg;
    if (rate !== undefined && rate !== null) {
      this.crop.pricePerUnit = rate;
      this.onPriceChange();
    }
  }

  selectCommodity(item: MandiPriceBenchmark): void {
    this.crop.cropName = item.commodity;
    this.crop.cropType = item.category;
    this.crop.imageUrl = item.imageUrl || resolveCropImage(item.commodity);
    this.errorMessage = '';
    this.triggerRecommendation();
  }

  onCropNameInput(val: string): void {
    if (!val || !val.trim()) {
      this.recommendation = null;
      this.matchedGovPrice = null;
      return;
    }
    this.crop.imageUrl = resolveCropImage(val.trim());
    this.triggerRecommendation();
  }

  onPriceChange(): void {
    if (this.matchedGovPrice && this.crop.pricePerUnit) {
      if (this.isPriceHigherThanGov()) {
        this.errorMessage = `Price Alert: Your selling price (₹${this.crop.pricePerUnit}/Kg) exceeds the suggested Mandi benchmark of ₹${this.matchedGovPrice.modalPricePerKg}/Kg.`;
      } else {
        this.errorMessage = '';
      }
    } else {
      this.errorMessage = '';
    }
  }

  isPriceHigherThanGov(): boolean {
    if (!this.matchedGovPrice || this.crop.pricePerUnit === undefined || this.crop.pricePerUnit === null) {
      return false;
    }
    return Number(this.crop.pricePerUnit) > this.matchedGovPrice.modalPricePerKg;
  }

  getValidationStatusClass(): string {
    if (this.recommendation?.matchType === 'NO_DATA') return 'neutral';
    if (!this.crop.pricePerUnit) return 'neutral';
    return this.isPriceHigherThanGov() ? 'violated' : 'valid';
  }

  getMatchBadgeClass(): string {
    switch (this.recommendation?.matchType) {
      case 'SAME_DISTRICT': return 'badge-tag-district';
      case 'NEAREST_MARKET': return 'badge-tag-nearest';
      case 'REGIONAL_ESTIMATE': return 'badge-tag-regional';
      case 'NO_DATA': return 'badge-tag-nodata';
      default: return 'badge-tag-district';
    }
  }

  getMatchBadgeIcon(): string {
    switch (this.recommendation?.matchType) {
      case 'SAME_DISTRICT': return 'fa-solid fa-circle-check';
      case 'NEAREST_MARKET': return 'fa-solid fa-location-arrow';
      case 'REGIONAL_ESTIMATE': return 'fa-solid fa-compass';
      case 'NO_DATA': return 'fa-solid fa-circle-exclamation';
      default: return 'fa-regular fa-clock';
    }
  }

  getPlaceholderPrice(): string {
    const rate = this.recommendation?.recommendedPricePerKg || this.matchedGovPrice?.modalPricePerKg;
    return rate ? `Max ceiling: <= ₹${rate}` : 'e.g. 25';
  }

  mapCategory(commodity: string): string {
    const c = commodity.toLowerCase();
    if (c.includes('tomato') || c.includes('onion') || c.includes('potato') || c.includes('brinjal') || c.includes('cabbage') || c.includes('cauliflower') || c.includes('carrot')) return 'Vegetables';
    if (c.includes('banana') || c.includes('apple') || c.includes('mango') || c.includes('coconut') || c.includes('pomegranate') || c.includes('watermelon')) return 'Fruits';
    if (c.includes('turmeric') || c.includes('chilli') || c.includes('clove') || c.includes('cardamom') || c.includes('coriander') || c.includes('cumin')) return 'Spices';
    if (c.includes('groundnut') || c.includes('soybean') || c.includes('mustard')) return 'Oilseeds';
    if (c.includes('gram') || c.includes('pulse') || c.includes('dal') || c.includes('chana') || c.includes('moong') || c.includes('urad') || c.includes('toor')) return 'Pulses';
    if (c.includes('cotton') || c.includes('sugarcane') || c.includes('jute')) return 'Commercial';
    return 'Grains';
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedImagePreview = e.target.result;
    };
    reader.readAsDataURL(file);

    this.isUploadingImage = true;
    this.cropService.uploadCropImage(file).subscribe({
      next: (res: any) => {
        this.isUploadingImage = false;
        const uploadedUrl = res.imageUrl || res.url;
        if (uploadedUrl) {
          this.cloudinaryUploadedUrl = uploadedUrl;
          this.crop.imageUrl = uploadedUrl;
        }
      },
      error: (err) => {
        console.warn('Cloudinary upload warning:', err);
        this.isUploadingImage = false;
      }
    });
  }

  onPreviewError(event: any): void {
    if (this.crop.cropName) {
      event.target.src = resolveCropImage(this.crop.cropName);
    }
  }

  onSubmit(): void {
    if (!this.crop.cropName || !this.crop.pricePerUnit || !this.crop.quantity) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    if (this.recommendation?.matchType !== 'NO_DATA' && this.matchedGovPrice && this.isPriceHigherThanGov()) {
      this.errorMessage = `Violation: Your selling price (₹${this.crop.pricePerUnit}/Kg) must be equal to or less than the suggested Mandi rate of ₹${this.matchedGovPrice.modalPricePerKg}/Kg.`;
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    const finalImage = this.crop.imageUrl || this.cloudinaryUploadedUrl || resolveCropImage(this.crop.cropName);
    this.saveCrop(finalImage);
  }

  private saveCrop(finalImageUrl: string): void {
    const govRate = this.recommendation?.recommendedPricePerKg || (this.matchedGovPrice ? this.matchedGovPrice.modalPricePerKg : 25.0);
    const user = this.authService.currentUserValue;
    const fId = (user && (user.id || user.userId)) ? String(user.id || user.userId) : (this.crop.farmerId || '1');
    const fName = (user && (user.fullName || user.username)) ? (user.fullName || user.username) : (this.crop.farmerName || 'Farmer Producer');

    const cropToSave: Crop = {
      id: 'crop-' + Date.now(),
      cropName: this.crop.cropName || 'Harvest',
      cropType: this.crop.cropType || 'Grains',
      quantity: Number(this.crop.quantity) || 100,
      unit: this.crop.unit || 'Kg',
      pricePerUnit: Number(this.crop.pricePerUnit),
      location: this.crop.location || (user?.address || 'Punjab Mandi'),
      state: this.selectedState || (this.crop.location ? this.crop.location.split(',')[1]?.trim() : undefined),
      district: this.selectedDistrict || (this.crop.location ? this.crop.location.split(',')[0]?.trim() : undefined),
      farmerId: fId,
      farmerName: fName,
      description: this.crop.description,
      imageUrl: finalImageUrl,
      govMspPrice: govRate,
      recommendedPrice: this.recommendation?.recommendedPricePerKg || undefined,
      mandiPriceMatch: this.recommendation?.matchType || undefined,
      sourceMarket: this.recommendation?.sourceMarket || undefined,
      sourceArrivalDate: this.recommendation?.sourceArrivalDate || undefined,
      sourceDistanceKm: this.recommendation?.distanceKm || undefined,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString()
    };

    this.cropService.addCrop(cropToSave).subscribe({
      next: (savedCrop) => {
        this.subscriptionService.notifySubscribersOnNewCrop(savedCrop || cropToSave);
        this.cropService.getAllCrops().subscribe();
        this.submitting = false;
        this.successMessage = `Crop "${cropToSave.cropName}" published successfully at ₹${cropToSave.pricePerUnit}/Kg! Subscribed dealers have been notified.`;
        setTimeout(() => this.router.navigate(['/crops']), 1500);
      },
      error: () => {
        this.subscriptionService.notifySubscribersOnNewCrop(cropToSave);
        this.cropService.getAllCrops().subscribe();
        this.submitting = false;
        this.successMessage = `Crop "${cropToSave.cropName}" published successfully at ₹${cropToSave.pricePerUnit}/Kg! Subscribed dealers have been notified.`;
        setTimeout(() => this.router.navigate(['/crops']), 1500);
      }
    });
  }
}
