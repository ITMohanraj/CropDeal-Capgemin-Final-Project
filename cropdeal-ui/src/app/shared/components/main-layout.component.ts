import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';
import { ChatbotComponent } from './chatbot.component';
import { AuthModalComponent } from './auth-modal.component';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, ChatbotComponent, AuthModalComponent],
  template: `
    <div class="app-layout">
      <!-- Fixed Top Navbar: Spans 100% width across all pages, logo never overlapped -->
      <app-header></app-header>

      <div class="layout-body" [class.has-sidebar]="isSidebarVisible">
        <!-- Mobile/Tablet Sidebar Backdrop -->
        <div class="sidebar-mobile-backdrop" *ngIf="isSidebarVisible" (click)="closeSidebar()"></div>

        <!-- Sidebar: ONLY exposed when authenticated AND explicitly on dashboard / management routes -->
        <app-sidebar *ngIf="isSidebarVisible"></app-sidebar>

        <main class="main-content" [class.no-sidebar]="!isSidebarVisible">
          <div class="content-wrapper" [class.landing-mode]="isLandingPage" [class.full-bleed]="!isSidebarVisible">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <app-chatbot></app-chatbot>
      <app-auth-modal></app-auth-modal>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: var(--bg-page, #f8fafc);
      width: 100%;
    }
    .layout-body {
      margin-top: 70px;
      display: flex;
      flex: 1;
      min-height: calc(100vh - 70px);
      width: 100%;
      position: relative;
    }
    .sidebar-mobile-backdrop {
      display: none;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow-x: hidden;
      transition: all 0.2s ease-in-out;
      background: var(--bg-page, #f8fafc);
    }
    .main-content.no-sidebar {
      width: 100%;
      flex: 1 1 100%;
    }
    .content-wrapper {
      flex: 1;
      padding: 1.5rem 2rem;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
    }
    .content-wrapper.full-bleed {
      max-width: 100%;
      padding: 1.5rem 2.5rem;
    }
    .content-wrapper.landing-mode {
      padding: 0 !important;
      max-width: 100% !important;
      margin: 0 !important;
    }
    @media (min-width: 1920px) and (max-width: 2559px) {
      .layout-body {
        margin-top: 76px;
        min-height: calc(100vh - 76px);
      }
      .content-wrapper {
        max-width: 1860px !important;
        padding: 2rem 3rem;
      }
      .content-wrapper.full-bleed {
        padding: 2rem 3.5rem;
      }
    }
    @media (min-width: 2560px) {
      .layout-body {
        margin-top: 84px;
        min-height: calc(100vh - 84px);
      }
      .content-wrapper {
        max-width: 2400px !important;
        padding: 2.5rem 4rem;
      }
      .content-wrapper.full-bleed {
        padding: 2.5rem 4.5rem;
      }
    }
    @media (max-width: 1024px) {
      .sidebar-mobile-backdrop {
        display: block;
        position: fixed;
        top: 70px;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(2px);
        z-index: 1040;
      }
      app-sidebar {
        position: fixed !important;
        top: 70px !important;
        left: 0 !important;
        bottom: 0 !important;
        height: calc(100vh - 70px) !important;
        z-index: 1050 !important;
        width: auto !important;
      }
      .main-content {
        width: 100% !important;
        flex: 1 1 100% !important;
        min-width: 0 !important;
      }
      .content-wrapper, .content-wrapper.full-bleed {
        width: 100% !important;
        max-width: 100% !important;
        padding: 1rem 0.75rem;
        box-sizing: border-box;
      }
    }
    @media (max-width: 768px) {
      .content-wrapper, .content-wrapper.full-bleed {
        padding: 0.75rem 0.5rem;
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  isSidebarVisible = false;
  isLandingPage = false;
  private subs: Subscription[] = [];

  constructor(
    private sidebarService: SidebarService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check initial route for landing page full-width mode
    this.updateLandingState(this.router.url);

    // Track route changes for landing mode
    this.subs.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: any) => {
        this.updateLandingState(event.urlAfterRedirects || event.url);
      })
    );

    // Sidebar should ONLY be visible when user is authenticated AND sidebar is opened
    this.subs.push(
      combineLatest([
        this.sidebarService.isOpen$,
        this.authService.currentUser$
      ]).subscribe(([isOpen, user]) => {
        this.isSidebarVisible = isOpen && !!user;
      })
    );
  }

  private updateLandingState(url: string): void {
    const cleanUrl = url ? url.split('?')[0] : '';
    this.isLandingPage = cleanUrl === '' || cleanUrl === '/' || cleanUrl === '/landing';
  }

  closeSidebar(): void {
    this.sidebarService.close();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
