import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-modal-overlay" *ngIf="isOpen$ | async" (click)="onBackdropClick($event)">
      <div class="auth-modal-card shadow-2xl">
        <!-- Close Button -->
        <button class="modal-close-btn" (click)="close()" title="Close dialog">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- Left Visual Side Banner (matches image3 & image4) -->
        <div class="modal-left-banner">
          <div class="banner-overlay">
            <div class="banner-brand">
              <span class="brand-icon">🌱</span>
              <span class="brand-name">Crop<span class="text-green-light">Deal</span></span>
            </div>

            <div class="banner-headline">
              <h2>Connecting Farmers,<br><span class="text-accent">with Better Opportunities</span></h2>
              <p>CropDeal is an agricultural marketplace that helps farmers, dealers and delivery partners connect, trade and grow together.</p>
            </div>

            <div class="banner-features">
              <div class="feature-pill">
                <div class="pill-icon">🌱</div>
                <div class="pill-text">
                  <strong>Better Prices</strong>
                  <span>Get fair market value</span>
                </div>
              </div>

              <div class="feature-pill">
                <div class="pill-icon">🤝</div>
                <div class="pill-text">
                  <strong>Direct Connect</strong>
                  <span>Farmers and dealers together</span>
                </div>
              </div>

              <div class="feature-pill">
                <div class="pill-icon">🚚</div>
                <div class="pill-text">
                  <strong>Reliable Delivery</strong>
                  <span>Seamless trade and logistics</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Interactive Form Area -->
        <div class="modal-right-form">
          <!-- Action prompt notification -->
          <div class="action-alert" *ngIf="message$ | async as msg">
            <i class="fa-solid fa-shield-halved"></i>
            <span>{{ msg }}</span>
          </div>

          <!-- Tab Navigation -->
          <div class="tab-header">
            <button class="tab-btn" [class.active]="activeTab === 'quick'" (click)="activeTab = 'quick'">
              <i class="fa-solid fa-bolt"></i> 1-Click Login
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'login'" (click)="activeTab = 'login'">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'register'" (click)="activeTab = 'register'">
              <i class="fa-solid fa-user-plus"></i> Register
            </button>
          </div>

          <!-- Error / Success feedback -->
          <div *ngIf="errorMsg" class="alert-box error mt-2">
            <i class="fa-solid fa-circle-exclamation alert-ico-top"></i>
            <span>{{ errorMsg }}</span>
          </div>
          <div *ngIf="successMsg" class="alert-box success mt-2">
            <i class="fa-solid fa-circle-check"></i>
            <span>{{ successMsg }}</span>
          </div>

          <!-- TAB 1: 1-Click Quick Demo Login -->
          <div *ngIf="activeTab === 'quick'" class="tab-content">
            <div class="form-title-group">
              <h3>Quick 1-Click Role Login</h3>
              <p>Instant authenticated access with verified agricultural test accounts</p>
            </div>

            <div class="quick-roles-grid">
              <button class="role-quick-btn farmer" (click)="quickLogin('farmer@gmail.com', 'FARMER')">
                <div class="role-icon">🌾</div>
                <div class="role-info">
                  <div class="role-title">Farmer Account</div>
                  <div class="role-desc">{{ getRoleDesc('FARMER') }}</div>
                  <span class="role-tag">Post Harvest, Accept Bids, Negotiate</span>
                </div>
                <i class="fa-solid fa-angle-right arrow-icon"></i>
              </button>

              <button class="role-quick-btn dealer" (click)="quickLogin('dealer@gmail.com', 'DEALER')">
                <div class="role-icon">🏢</div>
                <div class="role-info">
                  <div class="role-title">Dealer Account</div>
                  <div class="role-desc">{{ getRoleDesc('DEALER') }}</div>
                  <span class="role-tag">Buy Crops, Bid Live, Wallet</span>
                </div>
                <i class="fa-solid fa-angle-right arrow-icon"></i>
              </button>

              <button class="role-quick-btn delivery" (click)="quickLogin('delivery@gmail.com', 'DELIVERY_PARTNER')">
                <div class="role-icon">🚚</div>
                <div class="role-info">
                  <div class="role-title">Delivery Partner</div>
                  <div class="role-desc">{{ getRoleDesc('DELIVERY_PARTNER') }}</div>
                  <span class="role-tag">Claim Shipments, Transit Milestones</span>
                </div>
                <i class="fa-solid fa-angle-right arrow-icon"></i>
              </button>

              <button class="role-quick-btn admin" (click)="quickLogin('admin@gmail.com', 'ADMIN')">
                <div class="role-icon">🛡️</div>
                <div class="role-info">
                  <div class="role-title">Administrator</div>
                  <div class="role-desc">{{ getRoleDesc('ADMIN') }}</div>
                  <span class="role-tag">Full Platform Management & Reports</span>
                </div>
                <i class="fa-solid fa-angle-right arrow-icon"></i>
              </button>
            </div>
          </div>

          <!-- TAB 2: Standard Login Form (matches image3) -->
          <div *ngIf="activeTab === 'login'" class="tab-content">
            <div class="form-title-group">
              <h3>Login to Your Account</h3>
              <p>Access your dashboard and continue with CropDeal</p>
            </div>

            <form (ngSubmit)="submitLogin()">
              <div class="input-field">
                <label>Email Address or Username</label>
                <div class="input-wrap">
                  <i class="fa-regular fa-envelope input-icon"></i>
                  <input type="text" [(ngModel)]="loginEmail" name="email" placeholder="Enter your email or username" autocomplete="off" required />
                </div>
              </div>

              <div class="input-field mt-3">
                <label>Password</label>
                <div class="input-wrap">
                  <i class="fa-solid fa-lock input-icon"></i>
                  <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="loginPassword" name="password" placeholder="Enter your password" autocomplete="new-password" required />
                  <button type="button" class="eye-toggle" (click)="showPassword = !showPassword">
                    <i class="fa-regular" [ngClass]="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                  </button>
                </div>
              </div>

              <div class="remember-row mt-2">
                <label class="remember-chk">
                  <input type="checkbox" [(ngModel)]="rememberMe" name="remember" />
                  <span>Remember me</span>
                </label>
                <a href="javascript:void(0)" (click)="openForgotFlow()" class="forgot-link">Forgot Password?</a>
              </div>

              <button type="submit" class="btn-submit-green mt-3" [disabled]="isSubmitting">
                <span *ngIf="!isSubmitting"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login</span>
                <span *ngIf="isSubmitting"><i class="fa-solid fa-spinner fa-spin"></i> Authenticating...</span>
              </button>

              <!-- Official Facebook Login Action -->
              <div class="divider-text mt-3"><span>or continue with</span></div>
              <button type="button" class="btn-facebook mt-2" (click)="loginWithFacebook()" [disabled]="isFbLoggingIn">
                <span *ngIf="!isFbLoggingIn">
                  <i class="fa-brands fa-facebook-f fb-icon"></i> Continue with Facebook
                </span>
                <span *ngIf="isFbLoggingIn">
                  <i class="fa-solid fa-spinner fa-spin fb-icon"></i> Connecting to Facebook...
                </span>
              </button>

              <div class="divider-text mt-3"><span>Don't have an account?</span></div>
              <button type="button" class="btn-outline-green mt-2" (click)="activeTab = 'register'">
                <i class="fa-solid fa-user-plus"></i> Register Now
              </button>
            </form>
          </div>

          <!-- TAB 4: Multi-Step Forgot Password with Real Email OTP -->
          <div *ngIf="activeTab === 'forgot'" class="tab-content">
            <div class="form-title-group">
              <h3>Reset Your Password</h3>
              <p>Verify your identity with an Email OTP to set a new password</p>
            </div>

            <!-- Step 1: Enter Email -->
            <div *ngIf="forgotStep === 1">
              <div class="input-field">
                <label>Registered Email Address</label>
                <div class="input-wrap">
                  <i class="fa-regular fa-envelope input-icon"></i>
                  <input type="email" [(ngModel)]="forgotEmail" placeholder="Enter your registered email address" autocomplete="off" required />
                </div>
              </div>
              <button type="button" class="btn-submit-green mt-4" (click)="sendForgotOtp()" [disabled]="isSendingOtp || !forgotEmail">
                <span *ngIf="!isSendingOtp"><i class="fa-solid fa-paper-plane"></i> Send OTP Code</span>
                <span *ngIf="isSendingOtp"><i class="fa-solid fa-spinner fa-spin"></i> Sending OTP via Email...</span>
              </button>
            </div>

            <!-- Step 2: Verify 6-Digit OTP -->
            <div *ngIf="forgotStep === 2">
              <div class="alert-info-box mb-3">
                <i class="fa-solid fa-circle-info me-1"></i> OTP sent to <strong>{{ forgotEmail }}</strong>. Check inbox / spam.
              </div>
              <div class="input-field">
                <label>Enter 6-Digit OTP</label>
                <div class="input-wrap">
                  <i class="fa-solid fa-shield-halved input-icon"></i>
                  <input type="text" [(ngModel)]="forgotOtp" placeholder="Enter 6-digit OTP sent to your email" maxlength="6" autocomplete="off" required />
                </div>
              </div>
              <div class="d-flex justify-content-between align-center mt-2">
                <span class="subtext-muted">Didn't receive code?</span>
                <button type="button" class="btn-resend-link" (click)="sendForgotOtp()" [disabled]="isSendingOtp">Resend OTP</button>
              </div>
              <button type="button" class="btn-submit-green mt-4" (click)="verifyForgotOtp()" [disabled]="isVerifyingOtp || !forgotOtp">
                <span *ngIf="!isVerifyingOtp"><i class="fa-solid fa-check-circle"></i> Verify OTP Code</span>
                <span *ngIf="isVerifyingOtp"><i class="fa-solid fa-spinner fa-spin"></i> Verifying...</span>
              </button>
            </div>

            <!-- Step 3: Set New Password -->
            <div *ngIf="forgotStep === 3">
              <div class="alert-success-box mb-3">
                <i class="fa-solid fa-check-double me-1"></i> OTP Verified! Enter your new password below.
              </div>
              <div class="input-field">
                <label>New Password</label>
                <div class="input-wrap">
                  <i class="fa-solid fa-lock input-icon"></i>
                  <input type="password" [(ngModel)]="forgotNewPassword" placeholder="Enter new password (min. 6 characters)" autocomplete="new-password" required />
                </div>
              </div>
              <div class="input-field mt-3">
                <label>Confirm New Password</label>
                <div class="input-wrap">
                  <i class="fa-solid fa-lock-open input-icon"></i>
                  <input type="password" [(ngModel)]="forgotConfirmPassword" placeholder="Confirm your new password" autocomplete="new-password" required />
                </div>
              </div>
              <button type="button" class="btn-submit-green mt-4" (click)="submitNewPassword()" [disabled]="isResettingPassword || !forgotNewPassword">
                <span *ngIf="!isResettingPassword"><i class="fa-solid fa-key"></i> Update & Save Password</span>
                <span *ngIf="isResettingPassword"><i class="fa-solid fa-spinner fa-spin"></i> Updating...</span>
              </button>
            </div>

            <div class="mt-3 text-center">
              <button type="button" class="btn-back-link" (click)="activeTab = 'login'; forgotStep = 1">
                <i class="fa-solid fa-arrow-left"></i> Back to Login
              </button>
            </div>
          </div>

          <!-- TAB 3: Register Form (matches image4) -->
          <div *ngIf="activeTab === 'register'" class="tab-content">
            <div class="form-title-group">
              <h3>Create Your Account</h3>
              <p>Join CropDeal and start your journey with us</p>
            </div>

            <!-- Role Selector Cards -->
            <div class="role-selector-label">Select Your Role</div>
            <div class="role-cards-row">
              <div class="role-card" [class.selected]="regRole === 'FARMER'" (click)="regRole = 'FARMER'">
                <span class="role-check" *ngIf="regRole === 'FARMER'">✓</span>
                <div class="card-icon">🌱</div>
                <span class="card-name">Farmer</span>
              </div>
              <div class="role-card" [class.selected]="regRole === 'DEALER'" (click)="regRole = 'DEALER'">
                <span class="role-check" *ngIf="regRole === 'DEALER'">✓</span>
                <div class="card-icon">🏪</div>
                <span class="card-name">Dealer</span>
              </div>
              <div class="role-card" [class.selected]="regRole === 'DELIVERY_PARTNER'" (click)="regRole = 'DELIVERY_PARTNER'">
                <span class="role-check" *ngIf="regRole === 'DELIVERY_PARTNER'">✓</span>
                <div class="card-icon">🚚</div>
                <span class="card-name">Delivery Person</span>
              </div>
            </div>

            <form (ngSubmit)="submitRegister()" class="mt-3">
              <div class="grid-2col">
                <div class="input-field">
                  <label>Full Name</label>
                  <div class="input-wrap">
                    <i class="fa-regular fa-user input-icon"></i>
                    <input type="text" [(ngModel)]="regFullName" name="regFullName" placeholder="Enter your full name" autocomplete="off" required />
                  </div>
                </div>

                <div class="input-field">
                  <label>Email Address</label>
                  <div class="input-wrap">
                    <i class="fa-regular fa-envelope input-icon"></i>
                    <input type="email" [(ngModel)]="regEmail" name="regEmail" placeholder="Enter your email address" autocomplete="off" required />
                  </div>
                </div>
              </div>

              <div class="grid-2col mt-2">
                <div class="input-field">
                  <label>Phone Number</label>
                  <div class="input-wrap">
                    <i class="fa-solid fa-phone input-icon"></i>
                    <input type="tel" [(ngModel)]="regPhone" name="regPhone" placeholder="Enter 10-digit mobile number" maxlength="14" autocomplete="off" required />
                  </div>
                </div>

                <div class="input-field">
                  <label>Password</label>
                  <div class="input-wrap">
                    <i class="fa-solid fa-lock input-icon"></i>
                    <input type="password" [(ngModel)]="regPassword" name="regPassword" placeholder="Create password (min. 8 characters)" autocomplete="new-password" required />
                  </div>
                </div>
              </div>

              <div class="remember-row mt-2">
                <label class="remember-chk">
                  <input type="checkbox" [(ngModel)]="agreeTerms" name="agree" required />
                  <span>I agree to the <a href="javascript:void(0)" class="terms-link">Terms and Conditions</a> and <a href="javascript:void(0)" class="terms-link">Privacy Policy</a></span>
                </label>
              </div>

              <button type="submit" class="btn-submit-green mt-3" [disabled]="isSubmitting || !agreeTerms">
                <span *ngIf="!isSubmitting"><i class="fa-solid fa-user-plus"></i> Register Now</span>
                <span *ngIf="isSubmitting"><i class="fa-solid fa-spinner fa-spin"></i> Registering...</span>
              </button>

              <div class="divider-text mt-2"><span>Already have an account?</span></div>
              <button type="button" class="btn-outline-green mt-1" (click)="activeTab = 'login'">
                <i class="fa-solid fa-arrow-right-to-bracket"></i> Login
              </button>
            </form>
          </div>

        </div>
      </div>

      <!-- Secure Facebook Account Linking Modal (Case B) -->
      <div *ngIf="showFbLinkModal" class="fb-modal-overlay" (click)="onFbBackdropClick($event)">
        <div class="fb-modal-dialog shadow-2xl">
          <div class="fb-dialog-header">
            <div class="fb-brand-header">
              <div class="fb-header-icon"><i class="fa-brands fa-facebook-f"></i></div>
              <div>
                <h3 class="fb-modal-title">Link Existing CropDeal Account</h3>
                <p class="fb-modal-sub">Verify your CropDeal password to securely link Facebook</p>
              </div>
            </div>
            <button class="fb-close-btn" (click)="closeFbLinkModal()">&times;</button>
          </div>

          <div class="fb-dialog-body">
            <div *ngIf="fbLinkError" class="alert-box error mb-2">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>{{ fbLinkError }}</span>
            </div>
            <div *ngIf="fbLinkSuccess" class="alert-box success mb-2">
              <i class="fa-solid fa-circle-check"></i>
              <span>{{ fbLinkSuccess }}</span>
            </div>

            <div class="alert-info-box mb-3">
              <i class="fa-solid fa-circle-info"></i>
              <div>
                A CropDeal account with email <strong>{{ fbLinkEmail }}</strong> already exists.
                To prevent unauthorized account linking, please enter your CropDeal password to confirm.
              </div>
            </div>

            <div class="input-field mb-3">
              <label>CropDeal Password</label>
              <div class="input-wrap">
                <i class="fa-solid fa-lock input-icon"></i>
                <input [type]="showFbLinkPassword ? 'text' : 'password'" [(ngModel)]="fbLinkPassword" placeholder="Enter your CropDeal password" autocomplete="current-password" />
                <button type="button" class="eye-toggle" (click)="showFbLinkPassword = !showFbLinkPassword">
                  <i class="fa-regular" [ngClass]="showFbLinkPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
            </div>

            <button type="button" class="btn-facebook w-100" (click)="confirmFbLink()" [disabled]="isFbLinking || !fbLinkPassword">
              <span *ngIf="!isFbLinking">
                <i class="fa-solid fa-link"></i> Confirm &amp; Link Account
              </span>
              <span *ngIf="isFbLinking">
                <i class="fa-solid fa-spinner fa-spin"></i> Linking account...
              </span>
            </button>

            <div class="text-center mt-3">
              <button type="button" class="btn-link-subtle" (click)="closeFbLinkModal()">
                <i class="fa-solid fa-xmark"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Social Role Registration Modal (Case C) -->
      <div *ngIf="showFbRegModal" class="fb-modal-overlay" (click)="onFbBackdropClick($event)">
        <div class="fb-modal-dialog shadow-2xl">
          <div class="fb-dialog-header">
            <div class="fb-brand-header">
              <div class="fb-header-icon"><i class="fa-brands fa-facebook-f"></i></div>
              <div>
                <h3 class="fb-modal-title">Complete CropDeal Registration</h3>
                <p class="fb-modal-sub">Select your role and confirm details</p>
              </div>
            </div>
            <button class="fb-close-btn" (click)="closeFbRegModal()">&times;</button>
          </div>

          <div class="fb-dialog-body">
            <div *ngIf="fbRegError" class="alert-box error mb-2">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>{{ fbRegError }}</span>
            </div>
            <div *ngIf="fbRegSuccess" class="alert-box success mb-2">
              <i class="fa-solid fa-circle-check"></i>
              <span>{{ fbRegSuccess }}</span>
            </div>

            <div class="fb-account-badge mb-3">
              <div class="fb-avatar-circle">
                <i class="fa-brands fa-facebook-f"></i>
              </div>
              <div class="fb-account-info">
                <strong>{{ fbRegFullName || 'Facebook User' }}</strong>
                <span>{{ fbRegEmail || 'Verified via Meta OAuth' }}</span>
              </div>
              <span class="fb-verified-pill"><i class="fa-solid fa-circle-check"></i> Meta Verified</span>
            </div>

            <p class="role-selection-prompt mb-2">
              Select your marketplace role on CropDeal:
            </p>

            <div class="fb-roles-grid mb-3">
              <div class="fb-role-option" [class.selected]="fbRegRole === 'FARMER'" (click)="fbRegRole = 'FARMER'">
                <div class="fb-role-radio">
                  <span class="dot" *ngIf="fbRegRole === 'FARMER'"></span>
                </div>
                <div class="fb-role-icon">🌾</div>
                <div class="fb-role-text">
                  <div class="fb-role-name">Farmer / Producer</div>
                  <div class="fb-role-desc">Post harvest listings, accept dealer bids &amp; fair rates</div>
                </div>
              </div>

              <div class="fb-role-option" [class.selected]="fbRegRole === 'DEALER'" (click)="fbRegRole = 'DEALER'">
                <div class="fb-role-radio">
                  <span class="dot" *ngIf="fbRegRole === 'DEALER'"></span>
                </div>
                <div class="fb-role-icon">💼</div>
                <div class="fb-role-text">
                  <div class="fb-role-name">Wholesale Dealer / Buyer</div>
                  <div class="fb-role-desc">Purchase crops, live bidding &amp; wallet management</div>
                </div>
              </div>

              <div class="fb-role-option" [class.selected]="fbRegRole === 'DELIVERY_PARTNER'" (click)="fbRegRole = 'DELIVERY_PARTNER'">
                <div class="fb-role-radio">
                  <span class="dot" *ngIf="fbRegRole === 'DELIVERY_PARTNER'"></span>
                </div>
                <div class="fb-role-icon">🚚</div>
                <div class="fb-role-text">
                  <div class="fb-role-name">Delivery Partner</div>
                  <div class="fb-role-desc">Claim deliveries, logistics tracking &amp; OTP milestones</div>
                </div>
              </div>
            </div>

            <div class="input-field mb-2">
              <label>Full Name</label>
              <div class="input-wrap">
                <i class="fa-regular fa-user input-icon"></i>
                <input type="text" [(ngModel)]="fbRegFullName" placeholder="Enter your full name" required />
              </div>
            </div>

            <div class="input-field mb-2" *ngIf="!fbRegEmail">
              <label>Email Address</label>
              <div class="input-wrap">
                <i class="fa-regular fa-envelope input-icon"></i>
                <input type="email" [(ngModel)]="fbRegEmail" placeholder="Enter your email address" required />
              </div>
            </div>

            <div class="input-field mb-3">
              <label>Mobile Number (10 digits) *</label>
              <div class="input-wrap">
                <i class="fa-solid fa-phone input-icon"></i>
                <input type="tel" [(ngModel)]="fbRegPhone" placeholder="e.g. 9876543210" maxlength="10" required />
              </div>
            </div>

            <button type="button" class="btn-facebook w-100" (click)="confirmFbRegistration()" [disabled]="isFbRegistering || !fbRegPhone">
              <span *ngIf="!isFbRegistering">
                <i class="fa-solid fa-check"></i> Complete Registration &amp; Sign In
              </span>
              <span *ngIf="isFbRegistering">
                <i class="fa-solid fa-spinner fa-spin"></i> Creating CropDeal Account...
              </span>
            </button>

            <div class="text-center mt-3">
              <button type="button" class="btn-link-subtle" (click)="closeFbRegModal()">
                <i class="fa-solid fa-xmark"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
  `,
  styles: [`
    .auth-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .auth-modal-card {
      background: #ffffff;
      border-radius: 1.25rem;
      width: 100%;
      max-width: 960px;
      max-height: 90vh;
      display: flex;
      overflow: hidden;
      position: relative;
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    @keyframes scaleUp {
      from { transform: scale(0.94); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-close-btn {
      position: absolute;
      top: 1rem;
      right: 1.25rem;
      background: #f1f5f9;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      z-index: 20;
      transition: all 0.2s;
    }
    .modal-close-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    /* Left Banner */
    .modal-left-banner {
      width: 44%;
      background: linear-gradient(135deg, rgba(20, 83, 45, 0.92), rgba(22, 101, 52, 0.85)),
                  url('/assets/images/auth-side-banner.jpg') center/cover no-repeat;
      color: white;
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .banner-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      font-weight: 800;
    }
    .text-green-light { color: #86efac; }
    .text-accent { color: #86efac; }
    .banner-headline h2 {
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1.25;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      color: white;
    }
    .banner-headline p {
      font-size: 0.85rem;
      color: #e2e8f0;
      line-height: 1.5;
    }
    .banner-features {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 2rem;
    }
    .feature-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(4px);
      padding: 0.65rem 1rem;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .pill-icon { font-size: 1.25rem; }
    .pill-text { display: flex; flex-direction: column; }
    .pill-text strong { font-size: 0.825rem; font-weight: 700; color: white; }
    .pill-text span { font-size: 0.7rem; color: #cbd5e1; }

    /* Right Form Area */
    .modal-right-form {
      flex: 1;
      padding: 2.25rem 2.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .action-alert {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      padding: 0.6rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #1d4ed8;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .tab-header {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .tab-btn:hover { background: #f8fafc; color: #0f172a; }
    .tab-btn.active {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .form-title-group h3 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .form-title-group p {
      font-size: 0.825rem;
      color: #64748b;
      margin-top: 0.2rem;
      margin-bottom: 1rem;
    }
    .quick-roles-grid {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .role-quick-btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.15rem;
      border-radius: 0.75rem;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }
    .role-quick-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .role-quick-btn.farmer:hover { border-color: #22c55e; background: #f0fdf4; }
    .role-quick-btn.dealer:hover { border-color: #f59e0b; background: #fffbeb; }
    .role-quick-btn.delivery:hover { border-color: #0ea5e9; background: #f0f9ff; }
    .role-quick-btn.admin:hover { border-color: #8b5cf6; background: #faf5ff; }
    .role-icon { font-size: 1.75rem; }
    .role-info { flex: 1; }
    .role-title { font-size: 0.95rem; font-weight: 800; color: #0f172a; }
    .role-desc { font-size: 0.78rem; color: #475569; margin: 0.1rem 0; }
    .role-tag {
      font-size: 0.68rem;
      color: #166534;
      background: #dcfce7;
      padding: 0.1rem 0.45rem;
      border-radius: 0.25rem;
      font-weight: 700;
      display: inline-block;
    }
    .arrow-icon { color: #94a3b8; font-size: 0.9rem; }
    
    /* Input Fields */
    .input-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .input-field label { font-size: 0.78rem; font-weight: 700; color: #334155; }
    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      font-size: 0.85rem;
    }
    .input-wrap input {
      width: 100%;
      padding: 0.65rem 0.85rem 0.65rem 2.35rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      outline: none;
      transition: all 0.2s;
    }
    .input-wrap input:focus {
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
    }
    .eye-toggle {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
    }
    .remember-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
    }
    .remember-chk {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #475569;
      cursor: pointer;
    }
    .forgot-link { color: #16a34a; font-weight: 600; text-decoration: none; }
    .forgot-link:hover { text-decoration: underline; }
    .btn-submit-green {
      width: 100%;
      padding: 0.75rem;
      background: #15803d;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.2s;
    }
    .btn-submit-green:hover:not(:disabled) { background: #166534; }
    .btn-submit-green:disabled { opacity: 0.6; cursor: not-allowed; }
    .divider-text {
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
      line-height: 0.1em;
      margin: 1.25rem 0 0.85rem;
    }
    .divider-text span { background: #fff; padding: 0 0.75rem; color: #94a3b8; font-size: 0.75rem; }
    .btn-outline-green {
      width: 100%;
      padding: 0.65rem;
      background: white;
      color: #15803d;
      border: 1.5px solid #15803d;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .btn-outline-green:hover { background: #f0fdf4; }

    /* Register Role Cards */
    .role-selector-label { font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.4rem; }
    .role-cards-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.65rem;
    }
    .role-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 0.65rem;
      padding: 0.75rem 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }
    .role-card.selected {
      border-color: #15803d;
      background: #f0fdf4;
    }
    .role-check {
      position: absolute;
      top: 4px;
      right: 6px;
      background: #15803d;
      color: white;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      font-size: 0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon { font-size: 1.5rem; }
    .card-name { font-size: 0.78rem; font-weight: 700; color: #0f172a; }
    .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .alert-box {
      padding: 0.5rem 0.75rem;
      border-radius: 0.35rem;
      font-size: 0.8rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
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
      background: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(185, 28, 28, 0.25);
      border-radius: 0.4rem;
      padding: 0.5rem 0.65rem;
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
    .btn-meta-pill:hover {
      background: #166fe5;
    }
    .btn-meta-pill.alt {
      background: #0f766e;
    }
    .btn-meta-pill.alt:hover {
      background: #115e59;
    }
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
    .alert-box.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .alert-box.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .terms-link { color: #15803d; font-weight: 600; text-decoration: none; }
    .terms-link:hover { text-decoration: underline; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.75rem; }
    .mt-4 { margin-top: 1rem; }

    .btn-facebook {
      width: 100%;
      padding: 0.68rem;
      background: #1877f2;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      transition: background 0.2s;
    }
    .btn-facebook:hover { background: #166fe5; }
    .fb-icon { font-size: 1.1rem; }
    .alert-info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 0.65rem 0.85rem;
      border-radius: 0.45rem;
      font-size: 0.82rem;
    }
    .alert-success-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.65rem 0.85rem;
      border-radius: 0.45rem;
      font-size: 0.82rem;
    }
    .btn-resend-link {
      background: none;
      border: none;
      color: #15803d;
      font-weight: 700;
      font-size: 0.78rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .btn-back-link {
      background: none;
      border: none;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .btn-back-link:hover { color: #15803d; }
    .subtext-muted { font-size: 0.78rem; color: #64748b; }
    .text-blue { color: #1877f2; }
    .form-select-full {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.88rem;
      outline: none;
      background: white;
      color: #0f172a;
    }
    .form-select-full:focus { border-color: #16a34a; box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15); }
    .fb-account-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f0f7ff;
      border: 1px solid #c7dfff;
      border-radius: 0.5rem;
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
      font-size: 1.1rem;
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
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .fb-quick-chips {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .fb-chip {
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      padding: 0.2rem 0.6rem;
      font-size: 0.72rem;
      cursor: pointer;
      font-weight: 600;
      color: #1e40af;
      transition: all 0.15s;
    }
    .fb-chip:hover {
      background: #1877f2;
      color: #ffffff;
      border-color: #1877f2;
    }
    .meta-dialog-link {
      font-size: 0.76rem;
      color: #64748b;
      text-decoration: underline;
      cursor: pointer;
    }
    .meta-dialog-link:hover { color: #1877f2; }

    /* Facebook 2-Step Popup Dialog Styles */
    .fb-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(6px);
      z-index: 30000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    .fb-modal-dialog {
      background: #ffffff;
      border-radius: 1rem;
      max-width: 440px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(24, 119, 242, 0.25);
    }
    .fb-dialog-header {
      background: linear-gradient(135deg, #1877f2 0%, #166fe5 100%);
      color: #ffffff;
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .fb-dialog-header .fb-brand-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .fb-dialog-header .fb-header-icon {
      width: 40px;
      height: 40px;
      background: #ffffff;
      color: #1877f2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .fb-dialog-header .fb-modal-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .fb-dialog-header .fb-modal-sub {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.88);
      margin: 0.15rem 0 0;
    }
    .fb-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #ffffff;
      font-size: 1.3rem;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .fb-close-btn:hover {
      background: rgba(255, 255, 255, 0.35);
    }
    .fb-dialog-body {
      padding: 1.5rem;
    }
    .role-selection-prompt {
      font-size: 0.84rem;
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
      border-radius: 0.5rem;
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
      font-size: 1.25rem;
    }
    .fb-role-text {
      flex: 1;
    }
    .fb-role-name {
      font-size: 0.86rem;
      font-weight: 700;
      color: #0f172a;
    }
    .fb-role-desc {
      font-size: 0.74rem;
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
    .w-100 {
      width: 100%;
    }

    @media (max-width: 768px) {
      .auth-modal-card { flex-direction: column; max-height: 95vh; }
      .modal-left-banner { display: none; }
      .modal-right-form { padding: 1.5rem; }
      .grid-2col { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .auth-modal-card { border-radius: 0.75rem; }
      .modal-right-form { padding: 1rem 0.85rem; }
      .tab-header { gap: 0.25rem; overflow-x: auto; }
      .tab-btn { padding: 0.35rem 0.6rem; font-size: 0.76rem; }
    }
  `]
})
export class AuthModalComponent implements OnInit {
  isOpen$ = this.authModalService.isOpen$;
  message$ = this.authModalService.message$;

  activeTab: 'quick' | 'login' | 'register' | 'forgot' = 'quick';
  showPassword = false;
  rememberMe = true;
  isSubmitting = false;
  errorMsg = '';
  successMsg = '';

  // Login form
  loginEmail = '';
  loginPassword = '';

  // Multi-step Forgot Password
  forgotStep: number = 1;
  forgotEmail: string = '';
  forgotOtp: string = '';
  forgotNewPassword: string = '';
  forgotConfirmPassword: string = '';
  isSendingOtp: boolean = false;
  isVerifyingOtp: boolean = false;
  isResettingPassword: boolean = false;

  // Register form
  regRole: UserRole = 'FARMER';
  regFullName = '';
  regEmail = '';
  regPhone = '';
  regPassword = '';
  agreeTerms = true;

  constructor(
    private authModalService: AuthModalService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  getRoleDesc(role: UserRole): string {
    if (role === 'FARMER') return 'Farmer • Ludhiana Mandi';
    if (role === 'DEALER') return 'Dealer • Commercial Hub';
    if (role === 'DELIVERY_PARTNER') return 'Delivery Partner • ₹10/km Fleet';
    return 'System Administrator • Platform Supervisor';
  }

  ngOnInit(): void {
    this.isOpen$.subscribe(isOpen => {
      if (isOpen) {
        this.resetAllForms();
      }
    });
  }

  resetAllForms(): void {
    this.loginEmail = '';
    this.loginPassword = '';
    this.forgotEmail = '';
    this.forgotOtp = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.forgotStep = 1;
    this.regFullName = '';
    this.regEmail = '';
    this.regPhone = '';
    this.regPassword = '';
    this.showFbLinkModal = false;
    this.showFbRegModal = false;
    this.isFbLoggingIn = false;
    this.isFbLinking = false;
    this.isFbRegistering = false;
    this.fbLinkPassword = '';
    this.fbLinkError = '';
    this.fbRegError = '';
    this.errorMsg = '';
    this.successMsg = '';
  }

  close(): void {
    this.authModalService.close();
    this.resetAllForms();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('auth-modal-overlay')) {
      this.close();
    }
  }

  quickLogin(username: string, role: UserRole): void {
    const credMap: Record<string, { email: string; pass: string }> = {
      'FARMER': { email: 'farmer@gmail.com', pass: 'farmer@123' },
      'DEALER': { email: 'dealer@gmail.com', pass: 'dealer@123' },
      'DELIVERY_PARTNER': { email: 'delivery@gmail.com', pass: 'delivery@123' },
      'ADMIN': { email: 'admin@gmail.com', pass: 'admin@123' }
    };
    const creds = credMap[role] || { email: username, pass: 'dealer@123' };

    this.isSubmitting = true;
    this.authService.login({
      username: creds.email,
      email: creds.email,
      password: creds.pass
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMsg = `Logged in successfully as ${role}!`;
        setTimeout(() => {
          this.close();
          this.router.navigate(['/dashboard']);
        }, 300);
      },
      error: () => {
        this.isSubmitting = false;
        try {
          this.authService.loginWithDemo(creds.email, role);
          this.successMsg = `Logged in successfully as ${role}!`;
          setTimeout(() => {
            this.close();
            this.router.navigate(['/dashboard']);
          }, 300);
        } catch (e: any) {
          this.errorMsg = e?.message || 'Login failed';
        }
      }
    });
  }

  submitLogin(): void {
    if (!this.loginEmail.trim() || !this.loginPassword.trim()) {
      this.errorMsg = 'Please enter both username/email and password.';
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';

    const input = this.loginEmail.trim();
    const pass = this.loginPassword.trim();

    // Check if user is blocked
    try {
      const raw = localStorage.getItem('cropdeal_users_master');
      if (raw) {
        const list = JSON.parse(raw);
        const match = list.find((u: any) =>
          (u.email && u.email.toLowerCase() === input.toLowerCase()) ||
          (u.username && u.username.toLowerCase() === input.toLowerCase())
        );
        if (match && (match.status === 'BLOCKED' || match.isBlocked)) {
          this.errorMsg = '🚫 Access Denied: User account is blocked by administrator. Please contact support.';
          this.isSubmitting = false;
          return;
        }
      }
    } catch {}

    // Support quick demo logins with active credentials
    if ((input.toLowerCase() === 'farmer@gmail.com' && (pass === 'farmer@123' || pass === 'pass-farmer124')) || (input.toLowerCase() === 'farmer' && (pass === 'farmer@123' || pass === 'pass-farmer124'))) {
      this.quickLogin('farmer@gmail.com', 'FARMER');
      return;
    } else if ((input.toLowerCase() === 'dealer@gmail.com' && (pass === 'dealer@123' || pass === 'pass-dealer124')) || (input.toLowerCase() === 'dealer' && (pass === 'dealer@123' || pass === 'pass-dealer124'))) {
      this.quickLogin('dealer@gmail.com', 'DEALER');
      return;
    } else if ((input.toLowerCase() === 'delivery@gmail.com' && (pass === 'delivery@123' || pass === 'pass-delivery124')) || (['delivery', 'delivery_partner'].includes(input.toLowerCase()) && (pass === 'delivery@123' || pass === 'pass-delivery124'))) {
      this.quickLogin('delivery@gmail.com', 'DELIVERY_PARTNER');
      return;
    } else if ((input.toLowerCase() === 'admin@gmail.com' && (pass === 'admin@123' || pass === 'pass-admin124')) || (input.toLowerCase() === 'admin' && (pass === 'admin@123' || pass === 'pass-admin124'))) {
      this.quickLogin('admin@gmail.com', 'ADMIN');
      return;
    }

    const isEmail = input.includes('@');
    this.authService.login({
      username: input,
      email: isEmail ? input : undefined,
      password: pass
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.close();
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const msg = err.error?.message || err.error?.error || '';
        if (msg.toLowerCase().includes('block') || msg.toLowerCase().includes('suspend')) {
          this.errorMsg = '🚫 Access Denied: User account is blocked by administrator. Please contact support.';
        } else {
          this.errorMsg = msg || 'Invalid credentials. Please verify your email/username and password.';
        }
      }
    });
  }

  submitRegister(): void {
    if (!this.regFullName.trim() || !this.regEmail.trim() || !this.regPassword.trim()) {
      this.errorMsg = 'Please complete all required fields.';
      return;
    }

    if (this.regPassword.length < 8) {
      this.errorMsg = 'Password must be at least 8 characters long.';
      return;
    }

    let cleanPhone = (this.regPhone || '').replace(/\D/g, '');
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.length > 10 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(-10);
    }

    const indianMobileRegex = /^[6-9][0-9]{9}$/;
    if (!indianMobileRegex.test(cleanPhone)) {
      this.errorMsg = 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      return;
    }

    const emailTrim = this.regEmail.trim();
    const usernameTrim = emailTrim.split('@')[0];
    const displayName = this.regFullName.trim();



    this.isSubmitting = true;
    this.errorMsg = '';

    this.authService.register({
      username: usernameTrim,
      email: emailTrim,
      password: this.regPassword,
      role: this.regRole,
      fullName: displayName,
      name: displayName,
      phone: cleanPhone
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMsg = 'Account registered successfully! Logging you in...';
        this.authService.login({
          username: usernameTrim,
          email: emailTrim,
          password: this.regPassword
        }).subscribe({
          next: () => {
            setTimeout(() => {
              this.close();
              this.router.navigate(['/dashboard']);
            }, 600);
          },
          error: () => {
            setTimeout(() => {
              this.activeTab = 'login';
              this.loginEmail = '';
              this.loginPassword = '';
            }, 800);
          }
        });
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const msg = err.error?.message || err.error?.error || '';
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist') || err.status === 409) {
          this.errorMsg = 'Already registered, please login';
        } else {
          this.errorMsg = msg || 'Registration failed. Please check your details.';
        }
      }
    });
  }

  openForgotFlow(): void {
    this.activeTab = 'forgot';
    this.forgotStep = 1;
    this.errorMsg = '';
    this.successMsg = '';
    this.forgotEmail = '';
    this.forgotOtp = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
  }

  sendForgotOtp(): void {
    if (!this.forgotEmail.trim()) {
      this.errorMsg = 'Please enter your registered email address.';
      return;
    }
    this.isSendingOtp = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.authService.sendPasswordResetOtp(this.forgotEmail.trim()).subscribe({
      next: () => {
        this.isSendingOtp = false;
        this.forgotStep = 2;
        this.forgotOtp = '';
        this.successMsg = 'A 6-digit OTP code has been sent to ' + this.forgotEmail.trim() + '. Please check your email inbox.';
      },
      error: (err: any) => {
        this.isSendingOtp = false;
        this.errorMsg = err.error?.message || err.message || 'Could not send OTP. Please check your registered email address.';
      }
    });
  }

  verifyForgotOtp(): void {
    if (!this.forgotOtp.trim()) {
      this.errorMsg = 'Please enter the 6-digit OTP code.';
      return;
    }
    this.isVerifyingOtp = true;
    this.errorMsg = '';
    this.authService.verifyResetOtp(this.forgotEmail.trim(), this.forgotOtp.trim()).subscribe({
      next: (isValid) => {
        this.isVerifyingOtp = false;
        if (isValid) {
          this.forgotStep = 3;
          this.forgotNewPassword = '';
          this.forgotConfirmPassword = '';
          this.successMsg = 'OTP verified successfully! Please enter your new password.';
        } else {
          this.errorMsg = 'Invalid OTP code. Please enter the OTP sent to your email.';
        }
      },
      error: (err: any) => {
        this.isVerifyingOtp = false;
        this.errorMsg = err.error?.message || err.message || 'Invalid or expired OTP. Please check the code sent to your email.';
      }
    });
  }

  submitNewPassword(): void {
    if (!this.forgotNewPassword || this.forgotNewPassword.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      return;
    }
    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }
    this.isResettingPassword = true;
    this.errorMsg = '';
    this.authService.resetPasswordWithOtp(this.forgotEmail.trim(), this.forgotOtp.trim(), this.forgotNewPassword).subscribe({
      next: () => {
        this.isResettingPassword = false;
        this.successMsg = 'Password updated successfully! Please login with your new password.';
        setTimeout(() => {
          this.activeTab = 'login';
          this.forgotStep = 1;
          this.loginEmail = '';
          this.loginPassword = '';
          this.forgotEmail = '';
          this.forgotOtp = '';
          this.forgotNewPassword = '';
          this.forgotConfirmPassword = '';
        }, 1200);
      },
      error: (err: any) => {
        this.isResettingPassword = false;
        this.errorMsg = err.error?.message || err.message || 'Failed to reset password. Please check your OTP and try again.';
      }
    });
  }

  // Official Facebook OAuth Flow for Auth Modal
  isFbLoggingIn = false;

  // Linking Modal State (Case B)
  showFbLinkModal = false;
  fbLinkingToken = "";
  fbLinkEmail = "";
  fbLinkName = "";
  fbLinkPassword = "";
  showFbLinkPassword = false;
  isFbLinking = false;
  fbLinkError = "";
  fbLinkSuccess = "";

  // Registration Modal State (Case C)
  showFbRegModal = false;
  fbRegToken = "";
  fbRegFullName = "";
  fbRegEmail = "";
  fbRegPhone = "";
  fbRegRole: UserRole = "DEALER";
  isFbRegistering = false;
  fbRegError = "";
  fbRegSuccess = "";

  loginWithFacebook(): void {
    this.isFbLoggingIn = true;
    this.errorMsg = "";
    this.successMsg = "";

    this.authService.loginWithFacebook().subscribe({
      next: (res) => {
        this.isFbLoggingIn = false;
        if (res.status === "SUCCESS") {
          this.successMsg = "Welcome, " + (res.providerDisplayName || res.username || "User") + "! Logged in with Facebook.";
          setTimeout(() => {
            this.close();
            this.router.navigate(["/dashboard"]);
          }, 500);
        } else if (res.status === "LINK_REQUIRED") {
          this.fbLinkingToken = res.linkingToken || "";
          this.fbLinkEmail = res.email || "";
          this.fbLinkName = res.providerDisplayName || "";
          this.fbLinkPassword = "";
          this.fbLinkError = "";
          this.fbLinkSuccess = "";
          this.showFbLinkModal = true;
        } else if (res.status === "REGISTRATION_REQUIRED") {
          this.fbRegToken = res.registrationToken || "";
          this.fbRegEmail = res.email || "";
          this.fbRegFullName = res.providerDisplayName || "";
          this.fbRegPhone = "";
          this.fbRegRole = "DEALER";
          this.fbRegError = "";
          this.fbRegSuccess = "";
          this.showFbRegModal = true;
        }
      },
      error: (err) => {
        this.isFbLoggingIn = false;
        const msg = err?.error?.message || err?.message || "Failed to connect to Facebook. Please try again.";
        if (!msg.includes("Redirecting to Facebook")) {
          this.errorMsg = msg;
        }
      }
    });
  }

  isFbError(msg: string): boolean {
    return !!msg && (msg.toLowerCase().includes('facebook') || msg.toLowerCase().includes('meta'));
  }

  confirmFbLink(): void {
    if (!this.fbLinkPassword) {
      this.fbLinkError = "Please enter your CropDeal password to confirm account linking.";
      return;
    }
    this.isFbLinking = true;
    this.fbLinkError = "";
    this.fbLinkSuccess = "";

    this.authService.linkFacebookAccount(this.fbLinkingToken, this.fbLinkPassword).subscribe({
      next: () => {
        this.isFbLinking = false;
        this.fbLinkSuccess = "Facebook account linked successfully! Logging you in...";
        setTimeout(() => {
          this.closeFbLinkModal();
          this.close();
          this.router.navigate(["/dashboard"]);
        }, 600);
      },
      error: (err) => {
        this.isFbLinking = false;
        this.fbLinkError = err?.error?.message || err?.message || "Account linking failed. Please check your password.";
      }
    });
  }

  closeFbLinkModal(): void {
    this.showFbLinkModal = false;
    this.fbLinkingToken = "";
    this.fbLinkPassword = "";
    this.fbLinkError = "";
  }

  confirmFbRegistration(): void {
    if (this.fbRegRole === "ADMIN") {
      this.fbRegError = "Admin role is not permitted for social registration.";
      return;
    }
    if (!this.fbRegPhone || !/^[6-9]\d{9}$/.test(this.fbRegPhone.trim())) {
      this.fbRegError = "Please enter a valid 10-digit mobile number starting with 6-9.";
      return;
    }
    if (!this.fbRegFullName || !this.fbRegFullName.trim()) {
      this.fbRegError = "Please enter your full name.";
      return;
    }

    this.isFbRegistering = true;
    this.fbRegError = "";
    this.fbRegSuccess = "";

    this.authService.registerSocialUser({
      registrationToken: this.fbRegToken,
      role: this.fbRegRole,
      fullName: this.fbRegFullName.trim(),
      email: this.fbRegEmail?.trim(),
      phone: this.fbRegPhone.trim()
    }).subscribe({
      next: () => {
        this.isFbRegistering = false;
        this.fbRegSuccess = "Registration complete! Welcome to CropDeal as " + this.fbRegRole + ".";
        setTimeout(() => {
          this.closeFbRegModal();
          this.close();
          this.router.navigate(["/dashboard"]);
        }, 600);
      },
      error: (err) => {
        this.isFbRegistering = false;
        this.fbRegError = err?.error?.message || err?.message || "Social registration failed. Please try again.";
      }
    });
  }

  closeFbRegModal(): void {
    this.showFbRegModal = false;
    this.fbRegToken = "";
    this.fbRegError = "";
  }

  onFbBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains("fb-modal-overlay")) {
      this.closeFbLinkModal();
      this.closeFbRegModal();
    }
  }
}
