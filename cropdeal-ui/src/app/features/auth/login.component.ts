import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { CropService } from '../../core/services/crop.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card shadow-xl">
        <!-- Brand Header -->
        <div class="auth-header">
          <div class="auth-logo">
            <i class="fa-solid fa-seedling"></i>
          </div>
          <h2 class="auth-title">Welcome to Crop<span class="text-emerald">Deal</span></h2>
          <p class="auth-subtitle">Direct Agricultural Marketplace • Fair Prices for All</p>
        </div>

        <!-- Alert messages -->
        <div *ngIf="errorMessage" class="auth-alert alert-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>{{ errorMessage }}</span>
        </div>
        <div *ngIf="successMessage" class="auth-alert alert-success">
          <i class="fa-solid fa-circle-check"></i>
          <span>{{ successMessage }}</span>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onLogin()" class="auth-form">
          <div class="form-group">
            <label class="form-label">Username or Email</label>
            <div class="input-wrapper">
              <i class="fa-regular fa-user input-icon"></i>
              <input
                type="text"
                [(ngModel)]="username"
                name="username"
                class="form-control"
                placeholder="Enter your username or email"
                autocomplete="off"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label class="form-label">Password</label>
              <a href="javascript:void(0)" (click)="openForgotModal()" class="forgot-link">Forgot Password?</a>
            </div>
            <div class="input-wrapper">
              <i class="fa-solid fa-lock input-icon"></i>
              <input
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                class="form-control"
                placeholder="Enter your secret password"
                autocomplete="new-password"
                required
              />
              <button type="button" class="eye-btn" (click)="showPassword = !showPassword">
                <i class="fa-regular" [ngClass]="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            <span *ngIf="!loading">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Marketplace
            </span>
            <span *ngIf="loading">
              <i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating...
            </span>
          </button>

          <!-- Official Facebook Login Action -->
          <div class="divider-text mt-3"><span>or continue with</span></div>
          <button type="button" class="btn-facebook btn-block mt-2" (click)="handleFacebookLogin()" [disabled]="fbLoading">
            <span *ngIf="!fbLoading">
              <i class="fa-brands fa-facebook-f fb-icon"></i> Continue with Facebook
            </span>
            <span *ngIf="fbLoading">
              <i class="fa-solid fa-spinner fa-spin fb-icon"></i> Connecting to Facebook...
            </span>
          </button>
        </form>

        <!-- Quick Credential Helper for Testing -->
        <div class="demo-helpers">
          <span class="helper-title">Quick Demo Login:</span>
          <div class="helper-chips">
            <button type="button" (click)="fillDemo('farmer@gmail.com', 'farmer@123', 'FARMER')">🌾 Farmer</button>
            <button type="button" (click)="fillDemo('dealer@gmail.com', 'dealer@123', 'DEALER')">💼 Dealer</button>
            <button type="button" (click)="fillDemo('delivery@gmail.com', 'delivery@123', 'DELIVERY_PARTNER')">🚚 Delivery Partner</button>
            <button type="button" (click)="fillDemo('admin@gmail.com', 'admin@123', 'ADMIN')">🛡️ Admin</button>
          </div>
        </div>

        <!-- Footer -->
        <div class="auth-footer">
          <p>New to CropDeal? <a routerLink="/auth/register" class="register-link">Create an Account</a></p>
        </div>
      </div>

      <!-- Secure Facebook Account Linking Modal (Case B) -->
      <div *ngIf="showLinkModal" class="login-modal-overlay">
        <div class="modal-content modal-facebook">
          <div class="modal-header fb-modal-header">
            <div class="fb-brand-header">
              <div class="fb-header-icon"><i class="fa-brands fa-facebook-f"></i></div>
              <div>
                <h3 class="fb-modal-title">Link Existing CropDeal Account</h3>
                <p class="fb-modal-sub">Verify your CropDeal password to securely link Facebook</p>
              </div>
            </div>
            <button class="close-icon text-white" (click)="closeLinkModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div *ngIf="linkError" class="auth-alert alert-error mb-3">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{{ linkError }}</span>
            </div>
            <div *ngIf="linkSuccess" class="auth-alert alert-success mb-3">
              <i class="fa-solid fa-circle-check"></i>
              <span>{{ linkSuccess }}</span>
            </div>

            <div class="alert-info-box mb-3">
              <i class="fa-solid fa-circle-info"></i>
              <div>
                A CropDeal account with email <strong>{{ linkEmail }}</strong> already exists.
                To prevent unauthorized account linking, please enter your existing CropDeal password to confirm.
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">CropDeal Account Password</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-lock input-icon"></i>
                <input [type]="showLinkPassword ? 'text' : 'password'" [(ngModel)]="linkPassword" class="form-control" placeholder="Enter your CropDeal password" autocomplete="current-password" />
                <button type="button" class="eye-btn" (click)="showLinkPassword = !showLinkPassword">
                  <i class="fa-regular" [ngClass]="showLinkPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
            </div>

            <button type="button" class="btn btn-facebook btn-block" (click)="confirmLinkAccount()" [disabled]="linking || !linkPassword">
              <span *ngIf="!linking">
                <i class="fa-solid fa-link"></i> Confirm &amp; Link Account
              </span>
              <span *ngIf="linking">
                <i class="fa-solid fa-spinner fa-spin"></i> Linking account...
              </span>
            </button>

            <div class="text-center mt-3">
              <button type="button" class="btn-link-subtle" (click)="closeLinkModal()">
                <i class="fa-solid fa-xmark"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Social Registration & Role Selection Modal (Case C) -->
      <div *ngIf="showRegisterModal" class="login-modal-overlay">
        <div class="modal-content modal-facebook">
          <div class="modal-header fb-modal-header">
            <div class="fb-brand-header">
              <div class="fb-header-icon"><i class="fa-brands fa-facebook-f"></i></div>
              <div>
                <h3 class="fb-modal-title">Complete CropDeal Registration</h3>
                <p class="fb-modal-sub">Select your role and confirm details</p>
              </div>
            </div>
            <button class="close-icon text-white" (click)="closeRegisterModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div *ngIf="regError" class="auth-alert alert-error mb-3">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{{ regError }}</span>
            </div>
            <div *ngIf="regSuccess" class="auth-alert alert-success mb-3">
              <i class="fa-solid fa-circle-check"></i>
              <span>{{ regSuccess }}</span>
            </div>

            <!-- Verified Facebook Badge -->
            <div class="fb-account-badge mb-3">
              <div class="fb-avatar-circle">
                <i class="fa-brands fa-facebook-f"></i>
              </div>
              <div class="fb-account-info">
                <strong>{{ regFullName || 'Facebook User' }}</strong>
                <span>{{ regEmail || 'Verified via Meta OAuth' }}</span>
              </div>
              <span class="fb-verified-pill"><i class="fa-solid fa-circle-check"></i> Verified</span>
            </div>

            <p class="role-selection-prompt mb-2">
              Select your role in CropDeal marketplace:
            </p>

            <!-- Role Selector Cards (Strictly No Admin) -->
            <div class="fb-roles-grid mb-3">
              <div class="fb-role-option" [class.selected]="regRole === 'FARMER'" (click)="regRole = 'FARMER'">
                <div class="fb-role-radio">
                  <span class="dot" *ngIf="regRole === 'FARMER'"></span>
                </div>
                <div class="fb-role-icon">🌾</div>
                <div class="fb-role-text">
                  <div class="fb-role-name">Farmer / Producer</div>
                  <div class="fb-role-desc">Post harvests, receive bids, direct payment</div>
                </div>
              </div>

              <div class="fb-role-option" [class.selected]="regRole === 'DEALER'" (click)="regRole = 'DEALER'">
                <div class="fb-role-radio">
                  <span class="dot" *ngIf="regRole === 'DEALER'"></span>
                </div>
                <div class="fb-role-icon">💼</div>
                <div class="fb-role-text">
                  <div class="fb-role-name">Wholesale Dealer / Buyer</div>
                  <div class="fb-role-desc">Live crop bidding, direct purchase &amp; wallet</div>
                </div>
              </div>

              <div class="fb-role-option" [class.selected]="regRole === 'DELIVERY_PARTNER'" (click)="regRole = 'DELIVERY_PARTNER'">
                <div class="fb-role-radio">
                  <span class="dot" *ngIf="regRole === 'DELIVERY_PARTNER'"></span>
                </div>
                <div class="fb-role-icon">🚚</div>
                <div class="fb-role-text">
                  <div class="fb-role-name">Delivery Partner</div>
                  <div class="fb-role-desc">Claim deliveries, logistics tracking &amp; milestones</div>
                </div>
              </div>
            </div>

            <!-- Contact Information Fields -->
            <div class="form-group mb-2">
              <label class="form-label">Full Name</label>
              <div class="input-wrapper">
                <i class="fa-regular fa-user input-icon"></i>
                <input type="text" [(ngModel)]="regFullName" class="form-control" placeholder="Enter your full name" required />
              </div>
            </div>

            <div class="form-group mb-2" *ngIf="!regEmail">
              <label class="form-label">Email Address</label>
              <div class="input-wrapper">
                <i class="fa-regular fa-envelope input-icon"></i>
                <input type="email" [(ngModel)]="regEmail" class="form-control" placeholder="Enter your email address" required />
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Mobile Number (10 digits) *</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-phone input-icon"></i>
                <input type="tel" [(ngModel)]="regPhone" class="form-control" placeholder="e.g. 9876543210" maxlength="10" required />
              </div>
            </div>

            <button type="button" class="btn btn-facebook btn-block" (click)="confirmSocialRegistration()" [disabled]="registering || !regPhone">
              <span *ngIf="!registering">
                <i class="fa-solid fa-check"></i> Complete Registration &amp; Sign In
              </span>
              <span *ngIf="registering">
                <i class="fa-solid fa-spinner fa-spin"></i> Creating CropDeal Account...
              </span>
            </button>

            <div class="text-center mt-3">
              <button type="button" class="btn-link-subtle" (click)="closeRegisterModal()">
                <i class="fa-solid fa-xmark"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Forgot Password Modal (Sends OTP via backend Email Service) -->
      <div *ngIf="showForgotModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fa-solid fa-key text-emerald"></i> Reset Password</h3>
            <button class="close-icon" (click)="closeForgotModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc" *ngIf="forgotStep === 1">
              Enter your registered email address. We will send a 6-digit OTP verification code to reset your password.
            </p>

            <!-- Step 1: Email + Send OTP -->
            <div *ngIf="forgotStep === 1" class="form-group">
              <label class="form-label">Registered Email</label>
              <div class="input-wrapper">
                <i class="fa-regular fa-envelope input-icon"></i>
                <input type="email" [(ngModel)]="resetEmail" class="form-control" placeholder="Enter your registered email address" autocomplete="off" />
              </div>
              <button class="btn btn-primary mt-3 btn-block" (click)="sendOtp()" [disabled]="sendingOtp || !resetEmail">
                <span *ngIf="!sendingOtp"><i class="fa-solid fa-paper-plane"></i> Send OTP Code</span>
                <span *ngIf="sendingOtp"><i class="fa-solid fa-spinner fa-spin"></i> Sending OTP via Email...</span>
              </button>
            </div>

            <!-- Step 2: Verify OTP -->
            <div *ngIf="forgotStep === 2" class="otp-verification-flow">
              <div class="alert-info-box mb-3">
                <i class="fa-solid fa-circle-info"></i> 6-digit OTP sent to <strong>{{ resetEmail }}</strong>.
              </div>
              <div class="form-group">
                <label class="form-label">Enter 6-Digit OTP</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-shield-halved input-icon"></i>
                  <input type="text" [(ngModel)]="otpCode" class="form-control" placeholder="Enter 6-digit OTP sent to your email" maxlength="6" autocomplete="off" />
                </div>
              </div>
              <div class="d-flex justify-content-between align-center mt-2">
                <span class="subtext-muted">Didn't receive code?</span>
                <button type="button" class="btn-resend-link" (click)="sendOtp()" [disabled]="sendingOtp">Resend OTP</button>
              </div>
              <button class="btn btn-primary mt-3 btn-block" (click)="verifyOtp()" [disabled]="verifyingOtp || !otpCode">
                <span *ngIf="!verifyingOtp"><i class="fa-solid fa-circle-check"></i> Verify OTP Code</span>
                <span *ngIf="verifyingOtp"><i class="fa-solid fa-spinner fa-spin"></i> Verifying...</span>
              </button>
            </div>

            <!-- Step 3: New Password -->
            <div *ngIf="forgotStep === 3" class="otp-verification-flow">
              <div class="alert-success-box mb-3">
                <i class="fa-solid fa-check-double"></i> OTP Verified! Enter your new password below.
              </div>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-lock input-icon"></i>
                  <input type="password" [(ngModel)]="newPassword" class="form-control" placeholder="Enter new password (min. 6 characters)" autocomplete="new-password" />
                </div>
              </div>
              <div class="form-group mt-2">
                <label class="form-label">Confirm New Password</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-lock-open input-icon"></i>
                  <input type="password" [(ngModel)]="confirmPassword" class="form-control" placeholder="Re-enter your new password" autocomplete="new-password" />
                </div>
              </div>
              <button class="btn btn-primary mt-3 btn-block" (click)="submitResetPassword()" [disabled]="resetting || !newPassword">
                <span *ngIf="!resetting"><i class="fa-solid fa-key"></i> Update Password & Sign In</span>
                <span *ngIf="resetting"><i class="fa-solid fa-spinner fa-spin"></i> Updating...</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0e3b12 0%, #1b5e20 40%, #2e7d32 100%);
      padding: 1.5rem;
      position: relative;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: var(--radius-xl);
      padding: 2.5rem 2rem;
      position: relative;
      z-index: 10;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .auth-logo {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
      color: white;
      font-size: 1.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 8px 20px rgba(46, 125, 50, 0.35);
    }
    .auth-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-main);
    }
    .text-emerald { color: var(--primary-600); }
    .auth-subtitle {
      font-size: 0.825rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .auth-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .alert-ico-top {
      margin-top: 0.15rem;
      flex-shrink: 0;
    }
    .alert-content-wrap {
      flex: 1;
    }
    .fb-meta-troubleshoot {
      margin-top: 0.5rem;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(185, 28, 28, 0.25);
      border-radius: 0.4rem;
      padding: 0.55rem 0.75rem;
      color: #7f1d1d;
    }
    .fb-meta-troubleshoot-title {
      font-weight: 700;
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.25rem;
      color: #991b1b;
    }
    .fb-meta-troubleshoot-desc {
      font-size: 0.74rem;
      line-height: 1.35;
      margin: 0;
    }
    .fb-meta-troubleshoot-desc code {
      background: rgba(0, 0, 0, 0.06);
      padding: 0.1rem 0.25rem;
      border-radius: 0.2rem;
      font-weight: 600;
    }
    .fb-meta-sandbox-pills {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-top: 0.45rem;
    }
    .btn-meta-pill {
      background: #1877f2;
      color: #ffffff;
      border: none;
      border-radius: 0.3rem;
      padding: 0.25rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      transition: background 0.15s;
    }
    .btn-meta-pill:hover { background: #166fe5; }
    .btn-meta-pill.alt { background: #0f766e; }
    .btn-meta-pill.alt:hover { background: #115e59; }
    .meta-portal-link {
      font-size: 0.72rem;
      color: #1e40af;
      text-decoration: underline;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: 0.25rem;
    }
    .text-primary-fb {
      color: #1877f2 !important;
      font-weight: 600;
    }
    .fb-sandbox-panel {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 0.5rem;
      padding: 0.65rem 0.85rem;
      margin-top: 0.6rem;
    }
    .fb-sandbox-toggle {
      background: none;
      border: none;
      color: #475569;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .sandbox-scenario-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: 0.45rem;
    }
    .sandbox-btn {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.45rem 0.65rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      cursor: pointer;
      text-align: left;
      font-size: 0.76rem;
      transition: all 0.15s;
    }
    .sandbox-btn:hover {
      border-color: #1877f2;
      background: #eff6ff;
    }
    .sandbox-btn .badge-pill {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.15rem 0.35rem;
      border-radius: 0.25rem;
      flex-shrink: 0;
    }
    .badge-case-c { background: #dcfce7; color: #166534; }
    .badge-case-b { background: #fef3c7; color: #92400e; }
    .badge-case-a { background: #e0f2fe; color: #075985; }
    .alert-error {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid #fca5a5;
    }
    .alert-success {
      background: var(--success-bg);
      color: var(--success);
      border: 1px solid #86efac;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .forgot-link {
      font-size: 0.75rem;
      color: var(--primary-600);
      font-weight: 600;
    }
    .input-wrapper {
      position: relative;
    }
    .input-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-subtle);
    }
    .input-wrapper .form-control {
      padding-left: 2.6rem;
      padding-right: 2.6rem;
    }
    .eye-btn {
      position: absolute;
      right: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-subtle);
      cursor: pointer;
    }
    .btn-block {
      width: 100%;
      padding: 0.8rem;
    }
    .demo-helpers {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px dashed var(--border-color);
      text-align: center;
    }
    .helper-title {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .helper-chips {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 0.5rem;
    }
    .helper-chips button {
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      color: var(--text-main);
      transition: all var(--transition-fast);
    }
    .helper-chips button:hover {
      background: var(--primary-50);
      border-color: var(--primary-300);
      color: var(--primary-700);
    }
    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .register-link {
      font-weight: 700;
      color: var(--primary-600);
    }
    .close-icon {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .btn-facebook {
      background: #1877f2;
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      transition: background var(--transition-fast);
    }
    .btn-facebook:hover { background: #166fe5; }
    .fb-icon { font-size: 1.15rem; }
    .divider-text {
      text-align: center;
      border-bottom: 1px solid var(--border-color);
      line-height: 0.1em;
      margin: 1.25rem 0 0.85rem;
    }
    .divider-text span { background: #fff; padding: 0 0.75rem; color: var(--text-muted); font-size: 0.75rem; }
    .alert-info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .alert-success-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-resend-link {
      background: none;
      border: none;
      color: var(--primary-600);
      font-weight: 700;
      font-size: 0.78rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .subtext-muted { font-size: 0.78rem; color: var(--text-muted); }
    .mb-3 { margin-bottom: 0.85rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.85rem; }
    .text-white { color: #ffffff !important; }

    /* Facebook Modal Specific Styles */
    .login-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      height: 100vh;
      width: 100vw;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 1rem;
    }
    .modal-facebook {
      background: #ffffff;
      border-radius: var(--radius-xl);
      max-width: 440px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(24, 119, 242, 0.2);
    }
    .fb-modal-header {
      background: linear-gradient(135deg, #1877f2 0%, #166fe5 100%);
      color: #ffffff;
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .fb-brand-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .fb-header-icon {
      width: 42px;
      height: 42px;
      background: #ffffff;
      color: #1877f2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .fb-modal-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .fb-modal-sub {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.85);
      margin: 0.15rem 0 0;
    }
    .fb-account-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f0f7ff;
      border: 1px solid #c7dfff;
      border-radius: var(--radius-md);
      margin-bottom: 0.5rem;
    }
    .fb-avatar-circle {
      width: 36px;
      height: 36px;
      background: #1877f2;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
    }
    .fb-account-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      font-size: 0.82rem;
      line-height: 1.3;
    }
    .fb-account-info strong { color: #0f172a; }
    .fb-account-info span { color: #64748b; font-size: 0.75rem; }
    .fb-verified-pill {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .meta-dialog-link {
      font-size: 0.76rem;
      color: #64748b;
      text-decoration: underline;
      cursor: pointer;
    }
    .meta-dialog-link:hover { color: #1877f2; }
    .fb-quick-chips {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .fb-chip {
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: var(--radius-full);
      padding: 0.2rem 0.6rem;
      font-size: 0.72rem;
      cursor: pointer;
      font-weight: 600;
      color: #1e40af;
      transition: all var(--transition-fast);
    }
    .fb-chip:hover {
      background: #1877f2;
      color: #ffffff;
      border-color: #1877f2;
    }
    .role-selection-prompt {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }
    .fb-roles-grid {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .fb-role-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .fb-role-option:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .fb-role-option.selected {
      background: #eff6ff;
      border-color: #1877f2;
      box-shadow: 0 0 0 1px #1877f2;
    }
    .fb-role-radio {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .fb-role-option.selected .fb-role-radio {
      border-color: #1877f2;
    }
    .fb-role-radio .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #1877f2;
    }
    .fb-role-icon {
      font-size: 1.3rem;
    }
    .fb-role-text {
      flex: 1;
    }
    .fb-role-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0f172a;
    }
    .fb-role-desc {
      font-size: 0.75rem;
      color: #64748b;
    }
    .btn-link-subtle {
      background: none;
      border: none;
      color: #64748b;
      font-size: 0.8rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-link-subtle:hover {
      color: #1877f2;
      text-decoration: underline;
    }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Forgot Password Modal
  showForgotModal = false;
  forgotStep = 1;
  resetEmail = '';
  otpSent = false;
  sendingOtp = false;
  otpCode = '';
  verifyingOtp = false;
  newPassword = '';
  confirmPassword = '';
  resetting = false;

  constructor(
    private authService: AuthService,
    private cropService: CropService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // If inside OAuth popup window, notify opener and close immediately
    if (window.opener && (window.location.search.includes('code=') || window.location.search.includes('error='))) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error_description') || urlParams.get('error');
      try {
        window.opener.postMessage({ type: 'CROPDEAL_FB_AUTH', code, error }, window.location.origin);
      } catch (e) {
        console.warn('postMessage to opener failed:', e);
      }
      setTimeout(() => {
        try { window.close(); } catch (_) {}
      }, 50);
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['blocked'] === 'true') {
        this.errorMessage = '🚫 Access Denied: User account is blocked by administrator. Please contact support.';
      }
      if (params['error'] || params['error_description']) {
        this.fbLoading = false;
        this.errorMessage = decodeURIComponent(params['error_description'] || params['error'] || 'Facebook login was cancelled.');
      }
      if (params['status'] === 'LINK_REQUIRED') {
        this.linkingToken = params['linkingToken'] || '';
        this.linkEmail = params['email'] || '';
        this.linkName = params['name'] || '';
        this.showLinkModal = true;
      } else if (params['status'] === 'REGISTRATION_REQUIRED') {
        this.registrationToken = params['registrationToken'] || '';
        this.regEmail = params['email'] || '';
        this.regFullName = params['name'] || '';
        this.showRegisterModal = true;
      } else if (params['code']) {
        const code = params['code'];
        const redirectUri = window.location.origin + '/auth/login';
        this.fbLoading = true;
        this.authService.exchangeFacebookCode(code, redirectUri).subscribe({
          next: (res) => {
            this.fbLoading = false;
            if (res.status === 'SUCCESS') {
              this.successMessage = `Welcome, ${res.providerDisplayName || res.username || 'User'}! Signed in with Facebook.`;
              const returnUrl = sessionStorage.getItem('cropdeal_oauth_return') || '/dashboard';
              sessionStorage.removeItem('cropdeal_oauth_return');
              setTimeout(() => {
                this.router.navigateByUrl(returnUrl);
              }, 500);
            } else if (res.status === 'LINK_REQUIRED') {
              this.linkingToken = res.linkingToken || '';
              this.linkEmail = res.email || '';
              this.linkName = res.providerDisplayName || '';
              this.showLinkModal = true;
            } else if (res.status === 'REGISTRATION_REQUIRED') {
              this.registrationToken = res.registrationToken || '';
              this.regEmail = res.email || '';
              this.regFullName = res.providerDisplayName || '';
              this.showRegisterModal = true;
            }
          },
          error: (err) => {
            this.fbLoading = false;
            this.errorMessage = err?.error?.message || err?.message || 'Failed to exchange Facebook code.';
          }
        });
      } else if (params['token']) {
        const token = params['token'];
        const userId = params['userId'] || 'fb-' + Date.now();
        const email = params['email'] || '';
        const role = (params['role'] ? params['role'].replace('ROLE_', '') : 'DEALER') as UserRole;
        const name = params['name'] || (email ? email.split('@')[0] : 'Facebook User');

        const user = this.authService.handleOAuthCallback(token, userId, email, role, name);
        this.successMessage = `Welcome, ${user.fullName}! Signed in with Facebook.`;
        const returnUrl = sessionStorage.getItem('cropdeal_oauth_return') || '/dashboard';
        sessionStorage.removeItem('cropdeal_oauth_return');
        setTimeout(() => {
          this.router.navigateByUrl(returnUrl);
        }, 500);
      }
    });

    // Check for hash fragment access_token if present
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const tokenMatch = hash.match(/access_token=([^&]+)/);
      if (tokenMatch && tokenMatch[1]) {
        const accessToken = decodeURIComponent(tokenMatch[1]);
        this.fbLoading = true;
        this.authService.exchangeFacebookToken(accessToken).subscribe({
          next: (res) => {
            this.fbLoading = false;
            if (res.status === 'SUCCESS') {
              this.successMessage = `Welcome, ${res.providerDisplayName || res.username || 'User'}! Signed in with Facebook.`;
              const returnUrl = sessionStorage.getItem('cropdeal_oauth_return') || '/dashboard';
              sessionStorage.removeItem('cropdeal_oauth_return');
              setTimeout(() => {
                this.router.navigateByUrl(returnUrl);
              }, 500);
            } else if (res.status === 'LINK_REQUIRED') {
              this.linkingToken = res.linkingToken || '';
              this.linkEmail = res.email || '';
              this.linkName = res.providerDisplayName || '';
              this.showLinkModal = true;
            } else if (res.status === 'REGISTRATION_REQUIRED') {
              this.registrationToken = res.registrationToken || '';
              this.regEmail = res.email || '';
              this.regFullName = res.providerDisplayName || '';
              this.showRegisterModal = true;
            }
          },
          error: (err) => {
            this.fbLoading = false;
            this.errorMessage = err?.error?.message || err?.message || 'Failed to authenticate with Facebook.';
          }
        });
      }
    }
  }

  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    const input = this.username.trim();
    // Check if user is blocked in master storage
    try {
      const raw = localStorage.getItem('cropdeal_users_master');
      if (raw) {
        const list = JSON.parse(raw);
        const match = list.find((u: any) =>
          (u.email && u.email.toLowerCase() === input.toLowerCase()) ||
          (u.username && u.username.toLowerCase() === input.toLowerCase())
        );
        if (match && (match.status === 'BLOCKED' || match.isBlocked) && match.role !== 'ADMIN' && match.username?.toLowerCase() !== 'admin') {
          this.errorMessage = '🚫 Access Denied: User account is blocked by administrator. Please contact support.';
          return;
        }
      }
    } catch {}

    const isEmail = input.includes('@');
    this.loading = true;
    this.errorMessage = '';
    this.authService.login({
      username: input,
      email: isEmail ? input : undefined,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.loading = false;
        // User rule: "crop alert need to be only use our db and need to query only when login not ervrytime continuously"
        if (res.userId) {
          // Asynchronously evaluate price alerts against DB prices via RabbitMQ
          this.cropService.checkLoginPriceAlerts(res.userId).subscribe({
            next: () => {},
            error: () => {}
          });
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || err.error?.error || '';
        if (msg.toLowerCase().includes('block') || msg.toLowerCase().includes('suspend')) {
          this.errorMessage = '🚫 Access Denied: User account is blocked by administrator. Please contact support.';
        } else {
          this.errorMessage = msg || 'Login failed. Please check credentials or use demo accounts.';
        }
      }
    });
  }

  fillDemo(u: string, p: string, role: string): void {
    this.errorMessage = '';
    this.username = u;
    this.password = p;
    this.loading = true;

    this.authService.login({
      username: u,
      email: u.includes('@') ? u : undefined,
      password: p
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.userId) {
          this.cropService.checkLoginPriceAlerts(res.userId).subscribe({
            next: () => {},
            error: () => {}
          });
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || err.error?.error || '';
        if (msg.toLowerCase().includes('block') || msg.toLowerCase().includes('suspend')) {
          this.errorMessage = '🚫 Access Denied: User account is blocked by administrator. Please contact support.';
          return;
        }
        // Fallback to demo session
        try {
          this.authService.loginWithDemo(u, role as any);
          this.router.navigate(['/dashboard']);
        } catch (e: any) {
          this.errorMessage = e?.message || msg || 'Login failed. Please check credentials.';
        }
      }
    });
  }

  // Official Facebook OAuth Flow
  fbLoading = false;

  // Account Linking Modal (Case B: CropDeal email matches Facebook email)
  showLinkModal = false;
  linkingToken = '';
  linkEmail = '';
  linkName = '';
  linkPassword = '';
  showLinkPassword = false;
  linking = false;
  linkError = '';
  linkSuccess = '';

  // Social Role Registration Modal (Case C: New Facebook User)
  showRegisterModal = false;
  registrationToken = '';
  regFullName = '';
  regEmail = '';
  regPhone = '';
  regRole: UserRole = 'DEALER';
  registering = false;
  regError = '';
  regSuccess = '';

  handleFacebookLogin(): void {
    this.fbLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.loginWithFacebook().subscribe({
      next: (res) => {
        this.fbLoading = false;
        if (res.status === 'SUCCESS') {
          this.successMessage = 'Welcome, ' + (res.providerDisplayName || res.username || 'User') + '! Successfully signed in with Facebook.';
          const returnUrl = sessionStorage.getItem('cropdeal_oauth_return') || '/dashboard';
          sessionStorage.removeItem('cropdeal_oauth_return');
          setTimeout(() => {
            this.router.navigateByUrl(returnUrl);
          }, 500);
        } else if (res.status === 'LINK_REQUIRED') {
          this.linkingToken = res.linkingToken || '';
          this.linkEmail = res.email || '';
          this.linkName = res.providerDisplayName || '';
          this.linkPassword = '';
          this.linkError = '';
          this.linkSuccess = '';
          this.showLinkModal = true;
        } else if (res.status === 'REGISTRATION_REQUIRED') {
          this.registrationToken = res.registrationToken || '';
          this.regEmail = res.email || '';
          this.regFullName = res.providerDisplayName || '';
          this.regPhone = '';
          this.regRole = 'DEALER';
          this.regError = '';
          this.regSuccess = '';
          this.showRegisterModal = true;
        }
      },
      error: (err) => {
        this.fbLoading = false;
        const msg = err?.error?.message || err?.message || 'Failed to connect to Facebook. Please try again.';
        if (!msg.includes('Redirecting to Facebook')) {
          this.errorMessage = msg;
        }
      }
    });
  }

  isFbError(msg: string): boolean {
    return !!msg && (msg.toLowerCase().includes('facebook') || msg.toLowerCase().includes('meta'));
  }

  confirmLinkAccount(): void {
    if (!this.linkPassword) {
      this.linkError = 'Please enter your CropDeal password to confirm account linking.';
      return;
    }
    this.linking = true;
    this.linkError = '';
    this.linkSuccess = '';

    this.authService.linkFacebookAccount(this.linkingToken, this.linkPassword).subscribe({
      next: (res) => {
        this.linking = false;
        this.linkSuccess = 'Facebook account linked successfully! Logging you in...';
        setTimeout(() => {
          this.showLinkModal = false;
          this.router.navigate(['/dashboard']);
        }, 600);
      },
      error: (err) => {
        this.linking = false;
        this.linkError = err?.error?.message || err?.message || 'Account linking failed. Please check your CropDeal password.';
      }
    });
  }

  closeLinkModal(): void {
    this.showLinkModal = false;
    this.linkingToken = '';
    this.linkPassword = '';
    this.linkError = '';
  }

  confirmSocialRegistration(): void {
    if (this.regRole === 'ADMIN') {
      this.regError = 'Admin role is not permitted for social registration.';
      return;
    }
    if (!this.regPhone || !/^[6-9]\d{9}$/.test(this.regPhone.trim())) {
      this.regError = 'Please enter a valid 10-digit mobile number starting with 6-9.';
      return;
    }
    if (!this.regFullName || !this.regFullName.trim()) {
      this.regError = 'Please enter your full name.';
      return;
    }

    this.registering = true;
    this.regError = '';
    this.regSuccess = '';

    this.authService.registerSocialUser({
      registrationToken: this.registrationToken,
      role: this.regRole,
      fullName: this.regFullName.trim(),
      email: this.regEmail?.trim(),
      phone: this.regPhone.trim()
    }).subscribe({
      next: (res) => {
        this.registering = false;
        this.regSuccess = 'Registration complete! Welcome to CropDeal as ' + this.regRole + '.';
        setTimeout(() => {
          this.showRegisterModal = false;
          this.router.navigate(['/dashboard']);
        }, 600);
      },
      error: (err) => {
        this.registering = false;
        this.regError = err?.error?.message || err?.message || 'Social registration failed. Please try again.';
      }
    });
  }

  closeRegisterModal(): void {
    this.showRegisterModal = false;
    this.registrationToken = '';
    this.regError = '';
  }

  openForgotModal(): void {
    this.showForgotModal = true;
    this.forgotStep = 1;
    this.otpSent = false;
    this.resetEmail = '';
    this.otpCode = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeForgotModal(): void {
    this.showForgotModal = false;
    this.resetEmail = '';
    this.otpCode = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.forgotStep = 1;
  }

  sendOtp(): void {
    if (!this.resetEmail.trim()) {
      this.errorMessage = 'Please enter your registered email address.';
      return;
    }
    this.sendingOtp = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.sendPasswordResetOtp(this.resetEmail.trim()).subscribe({
      next: () => {
        this.sendingOtp = false;
        this.forgotStep = 2;
        this.otpCode = '';
        this.successMessage = 'A 6-digit verification OTP has been sent to ' + this.resetEmail.trim() + '. Please check your email inbox.';
      },
      error: (err: any) => {
        this.sendingOtp = false;
        this.errorMessage = err.error?.message || err.message || 'Failed to send OTP. Please verify your registered email address.';
      }
    });
  }

  verifyOtp(): void {
    if (!this.otpCode.trim()) {
      this.errorMessage = 'Please enter the 6-digit OTP code.';
      return;
    }
    this.verifyingOtp = true;
    this.errorMessage = '';
    this.authService.verifyResetOtp(this.resetEmail.trim(), this.otpCode.trim()).subscribe({
      next: (isValid) => {
        this.verifyingOtp = false;
        if (isValid) {
          this.forgotStep = 3;
          this.newPassword = '';
          this.confirmPassword = '';
          this.successMessage = 'OTP verified successfully! Please enter your new password.';
        } else {
          this.errorMessage = 'Invalid OTP code. Please enter the OTP sent to your email.';
        }
      },
      error: (err: any) => {
        this.verifyingOtp = false;
        this.errorMessage = err.error?.message || err.message || 'Invalid or expired OTP. Please check the code sent to your email.';
      }
    });
  }

  submitResetPassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    if (this.confirmPassword && this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }
    this.resetting = true;
    this.errorMessage = '';
    this.authService.resetPasswordWithOtp(this.resetEmail.trim(), this.otpCode.trim(), this.newPassword).subscribe({
      next: () => {
        this.resetting = false;
        this.showForgotModal = false;
        this.successMessage = 'Password reset successfully! Please sign in with your new password.';
        // Leave fields clean and empty with placeholder visible per user requirements
        this.username = '';
        this.password = '';
        this.resetEmail = '';
        this.otpCode = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err: any) => {
        this.resetting = false;
        this.errorMessage = err.error?.message || err.message || 'Failed to reset password. Please check your OTP and try again.';
      }
    });
  }
}
