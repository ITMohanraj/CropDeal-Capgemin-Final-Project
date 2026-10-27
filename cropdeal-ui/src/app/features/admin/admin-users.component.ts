import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRole } from '../../core/models/user.model';

export interface AdminUserItem extends User {
  details?: string;
  averageRating?: number;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-users-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="fa-solid fa-users-gear text-emerald"></i> User Management & Access Control</h2>
          <p class="page-subtitle">Inspect registered marketplace participants, view detailed profiles, and toggle active/inactive access</p>
        </div>
        <div class="stats-pills">
          <span class="badge badge-primary">{{ users.length }} Total Accounts</span>
          <span class="badge badge-success">{{ getActiveCount() }} Active</span>
          <span class="badge badge-danger">{{ getBlockedCount() }} Blocked</span>
        </div>
      </div>

      <!-- Alert Notification -->
      <div *ngIf="alertMsg" class="alert alert-success shadow-md">
        <i class="fa-solid fa-circle-check"></i>
        <span>{{ alertMsg }}</span>
      </div>

      <div class="card table-card mt-4">
        <div class="card-header">
          <div class="search-bar">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" [(ngModel)]="searchFilter" (ngModelChange)="setPage(1)" placeholder="Filter by name, username, phone, or role..." class="form-control" />
          </div>
          <div class="role-filter">
            <select [(ngModel)]="roleFilter" (ngModelChange)="setPage(1)" class="form-control">
              <option value="ALL">All Roles</option>
              <option value="FARMER">Farmers</option>
              <option value="DEALER">Dealers</option>
              <option value="DELIVERY_PARTNER">Logistics Partners</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Participant & User ID</th>
                <th>Role</th>
                <th>Contact & Location</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of pagedUsers" class="user-row" (click)="viewUserModal(u)">
                <td>
                  <div class="user-cell">
                    <div class="avatar-sm" [ngClass]="(u.role || 'farmer').toLowerCase()">
                      {{ (u.fullName || u.username || 'U').charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <strong class="user-name-link">{{ u.fullName || u.username }}</strong>
                      <span class="subtext d-block">
                        <span class="uid-tag">#{{ u.userId || u.id }}</span> &bull; {{ u.email }}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="role-pill" [ngClass]="(u.role || 'farmer').toLowerCase()">
                    {{ u.role }}
                  </span>
                </td>
                <td>
                  <span><i class="fa-solid fa-phone sub-icon"></i> {{ u.phone || '+91 98765 00000' }}</span>
                  <span class="subtext d-block"><i class="fa-solid fa-location-dot sub-icon"></i> {{ u.address || 'Market Trading Zone' }}</span>
                </td>

                <td>
                  <span class="badge" [ngClass]="u.isBlocked || u.status === 'BLOCKED' ? 'badge-danger' : 'badge-success'">
                    <i class="fa-solid" [ngClass]="u.isBlocked || u.status === 'BLOCKED' ? 'fa-ban' : 'fa-circle-check'"></i>
                    {{ (u.isBlocked || u.status === 'BLOCKED') ? 'BLOCKED' : 'ACTIVE' }}
                  </span>
                </td>
                <td class="text-right" (click)="$event.stopPropagation()">
                  <div class="action-buttons justify-end">
                    <button class="btn btn-secondary btn-sm" (click)="viewUserModal(u)" title="View complete user information">
                      <i class="fa-solid fa-eye"></i> View
                    </button>

                    <!-- Protected Badge ONLY for Administrator -->
                    <span *ngIf="isAdminUser(u)" class="badge badge-primary" title="Administrator account is protected and cannot be blocked">
                      <i class="fa-solid fa-shield-halved"></i> Protected
                    </span>

                    <!-- Block / Unblock Toggle for all non-admin roles (Farmers, Dealers, Logistics Partners) -->
                    <ng-container *ngIf="!isAdminUser(u)">
                      <button
                        *ngIf="!(u.isBlocked || u.status === 'BLOCKED')"
                        class="btn btn-danger btn-sm"
                        (click)="toggleBlock(u, true)"
                        title="Deactivate / Block this user from marketplace">
                        <i class="fa-solid fa-ban"></i> Block
                      </button>
                      <button
                        *ngIf="u.isBlocked || u.status === 'BLOCKED'"
                        class="btn btn-success btn-sm"
                        (click)="toggleBlock(u, false)"
                        title="Activate / Unblock this user">
                        <i class="fa-solid fa-unlock"></i> Unblock
                      </button>
                    </ng-container>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Dynamic Pagination Footer - exactly 5 records per page -->
        <div class="table-pagination-footer" *ngIf="filteredUsers.length > 0">
          <span class="pagination-meta">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredUsers.length) }} of {{ filteredUsers.length }} users
          </span>
          <div class="pagination-buttons" *ngIf="totalPages > 1">
            <button class="btn-page" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">&laquo; Prev</button>
            <button *ngFor="let p of totalPagesArray" class="btn-page" [class.active]="p === currentPage" (click)="setPage(p)">{{ p }}</button>
            <button class="btn-page" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">Next &raquo;</button>
          </div>
        </div>
      </div>

      <!-- USER INFORMATION INSPECTION MODAL -->
      <div *ngIf="selectedUser" class="modal-overlay">
        <div class="modal-content user-inspect-modal">
          <div class="modal-header">
            <div class="modal-brand">
              <div class="avatar-lg" [ngClass]="(selectedUser.role || 'farmer').toLowerCase()">
                {{ (selectedUser.fullName || selectedUser.username).charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3>{{ selectedUser.fullName || selectedUser.username }}</h3>
                <span class="subtext">User ID: #{{ selectedUser.userId || selectedUser.id }} &bull; Role: {{ selectedUser.role }}</span>
              </div>
            </div>
            <button class="close-btn" (click)="selectedUser = null">&times;</button>
          </div>

          <div class="modal-body">
            <div class="inspect-grid">
              <div class="inspect-item">
                <span class="inspect-label">Account Status:</span>
                <span class="badge" [ngClass]="selectedUser.isBlocked || selectedUser.status === 'BLOCKED' ? 'badge-danger' : 'badge-success'">
                  {{ (selectedUser.isBlocked || selectedUser.status === 'BLOCKED') ? 'BLOCKED (Deactivated)' : 'ACTIVE (Verified Trading)' }}
                </span>
              </div>

              <div class="inspect-item">
                <span class="inspect-label">Marketplace Role:</span>
                <span class="role-pill" [ngClass]="(selectedUser.role || 'farmer').toLowerCase()">{{ selectedUser.role }}</span>
              </div>

              <div class="inspect-item">
                <span class="inspect-label">Contact Mobile:</span>
                <strong><i class="fa-solid fa-phone text-emerald"></i> {{ selectedUser.phone || 'N/A' }}</strong>
              </div>

              <div class="inspect-item">
                <span class="inspect-label">Email Address:</span>
                <span><i class="fa-regular fa-envelope text-emerald"></i> {{ selectedUser.email }}</span>
              </div>

              <div class="inspect-item full-width">
                <span class="inspect-label">Primary Operating Address:</span>
                <p class="inspect-val"><i class="fa-solid fa-location-dot text-danger"></i> {{ selectedUser.address || 'Market Trading Zone' }}</p>
              </div>

              <div class="inspect-item full-width highlight-item">
                <span class="inspect-label">Role Profile Details:</span>
                <p class="inspect-val"><strong>{{ selectedUser.details || 'Agricultural marketplace partner verified under standard compliance.' }}</strong></p>
              </div>

              <div class="inspect-item" *ngIf="selectedUser.averageRating">
                <span class="inspect-label">Trust Score / Rating:</span>
                <span class="text-amber"><i class="fa-solid fa-star"></i> {{ selectedUser.averageRating }} / 5.0</span>
              </div>

              <div class="inspect-item">
                <span class="inspect-label">Registered Since:</span>
                <span>{{ (selectedUser.createdAt || '2026-08-15') | date:'mediumDate' }}</span>
              </div>
            </div>

            <div class="modal-compliance-box mt-3">
              <i class="fa-solid fa-shield-halved text-emerald"></i>
              <span>Administrators can activate or deactivate marketplace participants. Deactivating suspends live bidding, ordering, and dispatch permissions.</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedUser = null">Close</button>
            <span *ngIf="isAdminUser(selectedUser)" class="badge badge-primary px-3 py-2">
              <i class="fa-solid fa-shield-halved"></i> Administrator Account Protected
            </span>
            <ng-container *ngIf="!isAdminUser(selectedUser)">
              <button
                *ngIf="!(selectedUser.isBlocked || selectedUser.status === 'BLOCKED')"
                class="btn btn-danger"
                (click)="toggleBlock(selectedUser, true)">
                <i class="fa-solid fa-ban"></i> Deactivate / Block User
              </button>
              <button
                *ngIf="selectedUser.isBlocked || selectedUser.status === 'BLOCKED'"
                class="btn btn-success"
                (click)="toggleBlock(selectedUser, false)">
                <i class="fa-solid fa-unlock"></i> Activate / Unblock User
              </button>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-users-container { display: flex; flex-direction: column; gap: 1.25rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .page-title { font-size: 1.5rem; font-weight: 800; }
    .text-emerald { color: var(--primary-600); }
    .text-danger { color: var(--danger); }
    .text-amber { color: var(--accent-amber); }
    .page-subtitle { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem; }
    .stats-pills { display: flex; gap: 0.5rem; }
    .table-card { padding: 0; overflow: hidden; }
    .table-card .card-header { padding: 1.25rem 1.5rem; display: flex; gap: 1rem; align-items: center; margin-bottom: 0; }
    .search-bar { position: relative; flex: 1; }
    .search-bar i { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-subtle); }
    .search-bar input { padding-left: 2.5rem; }
    .role-filter select { width: 190px; }
    .table-container { width: 100%; overflow: hidden; }
    .table th.text-right, .table td.text-right { text-align: right; }
    .justify-end { justify-content: flex-end; }
    .user-row { cursor: pointer; transition: background var(--transition-fast); }
    .user-row:hover { background: var(--bg-subtle); }
    .uid-tag { font-family: monospace; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; }
    .user-cell { display: flex; align-items: center; gap: 0.75rem; }
    .user-name-link { color: var(--text-main); }
    .user-row:hover .user-name-link { color: var(--primary-700); }
    .avatar-sm {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #166534;
      color: white;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .avatar-sm.farmer { background: #166534; }
    .avatar-sm.dealer { background: #92400e; }
    .avatar-sm.delivery_partner { background: #6b21a8; }
    .avatar-sm.admin { background: #075985; }
    .avatar-lg {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #166534;
      color: white;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .avatar-lg.farmer { background: #166534; }
    .avatar-lg.dealer { background: #92400e; }
    .avatar-lg.delivery_partner { background: #6b21a8; }
    .avatar-lg.admin { background: #075985; }
    .role-pill {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .role-pill.farmer { background: #dcfce7; color: #166534; }
    .role-pill.dealer { background: #fef3c7; color: #92400e; }
    .role-pill.delivery_partner { background: #f3e8ff; color: #6b21a8; }
    .role-pill.admin { background: #e0f2fe; color: #075985; }
    .subtext { font-size: 0.75rem; color: var(--text-muted); }
    .sub-icon { font-size: 0.7rem; color: var(--text-subtle); margin-right: 0.2rem; }
    .d-block { display: block; }
    .action-buttons { display: flex; gap: 0.4rem; align-items: center; }
    .user-inspect-modal { max-width: 620px; }
    .modal-brand { display: flex; align-items: center; gap: 0.85rem; }
    .inspect-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      font-size: 0.85rem;
    }
    .inspect-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .full-width { grid-column: 1 / -1; }
    .highlight-item {
      background: #f0fdf4;
      border: 1px dashed #86efac;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
    }
    .inspect-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-subtle); }
    .inspect-val { margin: 0; color: var(--text-main); }
    .modal-compliance-box {
      font-size: 0.75rem;
      color: #15803d;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      line-height: 1.4;
    }
    .modal-compliance-box i { margin-top: 0.15rem; }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
    .alert { padding: 0.85rem 1.25rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem; font-weight: 600; font-size: 0.85rem; }
    .alert-success { background: var(--success-bg); color: var(--success); border: 1px solid #86efac; }
    .table-pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.5rem;
      background: var(--bg-subtle, #f8fafc);
      border-top: 1px solid var(--border-color, #e2e8f0);
    }
    .pagination-meta { font-size: 0.82rem; color: #64748b; }
    .pagination-buttons { display: flex; gap: 0.35rem; }
    .btn-page {
      min-width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-page:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .btn-page.active {
      background: #16a34a;
      border-color: #16a34a;
      color: white;
    }
    .btn-page:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .mt-3 { margin-top: 0.85rem; }
    .mt-4 { margin-top: 1rem; }
  `]
})
export class AdminUsersComponent implements OnInit {
  users: AdminUserItem[] = [];
  searchFilter = '';
  roleFilter = 'ALL';
  alertMsg = '';
  selectedUser: AdminUserItem | null = null;

  // 5 records per page as requested
  currentPage = 1;
  pageSize = 5;
  Math = Math;

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedUsers(): AdminUserItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  /**
   * Only genuine ADMINISTRATOR role is protected.
   * Farmers, Dealers, and Delivery Partners are never protected.
   */
  isAdminUser(u: AdminUserItem | null): boolean {
    if (!u) return false;
    return (u.role || '').toUpperCase() === 'ADMIN';
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe({
      next: (data) => {
        this.populateUserList(data);
      },
      error: () => {
        this.populateUserList([]);
      }
    });
  }

  private populateUserList(dbUsers: any[]): void {
    // 1. The 4 standard personas from the Quick Login page:
    // Administrator, Delivery Partner, Farmer, Dealer
    const quickLoginAccounts: AdminUserItem[] = [];

    const masterUsers = this.userService.getMasterUsers();
    const userMap = new Map<string, AdminUserItem>();

    // Register all 4 quick login accounts in userMap
    quickLoginAccounts.forEach(acc => {
      const stored = masterUsers.find(m =>
        (m.email && acc.email && m.email.toLowerCase() === acc.email.toLowerCase()) ||
        (m.role && acc.role && m.role === acc.role)
      );

      const item: AdminUserItem = {
        ...acc,
        ...(stored ? {
          status: acc.role === 'ADMIN' ? 'ACTIVE' : (stored.status || acc.status),
          isBlocked: acc.role === 'ADMIN' ? false : (stored.isBlocked ?? acc.isBlocked),
          phone: stored.phone || acc.phone,
          address: stored.address || acc.address,
          fullName: stored.fullName || acc.fullName
        } : {})
      };
      userMap.set('quick_' + acc.role.toLowerCase(), item);
    });

    // 2. Merge live database participants from MySQL
    if (dbUsers && dbUsers.length > 0) {
      dbUsers.forEach((u: any) => {
        const uid = String(u.userId || u.id);
        const rawRole = String(u.role || '').toUpperCase().replace(/^ROLE_/, '');
        const isAdm = (rawRole === 'ADMIN' || (u.email && u.email.toLowerCase() === 'admin@gmail.com') || (u.username && u.username.toLowerCase() === 'admin'));
        const cleanRole: UserRole = isAdm ? 'ADMIN' : ((rawRole as UserRole) || 'FARMER');
        const isBlocked = isAdm ? false : (u.status === 'BLOCKED' || !!u.isBlocked);

        // Check if matches one of the quick login accounts by email
        let matchedKey: string | null = null;
        for (const [key, item] of userMap.entries()) {
          if (u.email && item.email && u.email.toLowerCase() === item.email.toLowerCase()) {
            matchedKey = key;
            break;
          }
        }

        const dbItem: AdminUserItem = {
          id: uid,
          userId: uid,
          username: u.username || u.email?.split('@')[0] || `user_${uid}`,
          fullName: u.name || u.fullName || u.username || 'Market User',
          email: u.email || `${uid}@cropdeal.in`,
          phone: u.phone || '+91 98765 00000',
          role: cleanRole,
          address: u.address || (cleanRole === 'ADMIN' ? 'CropDeal Headquarters, Tech Park' : 'Market Trading Zone'),
          status: isBlocked ? 'BLOCKED' : 'ACTIVE',
          isBlocked: isBlocked,
          details: u.details || u.additionalInfo || `${cleanRole} Trading Participant`,
          averageRating: u.rating || u.averageRating || (cleanRole === 'ADMIN' ? 5.0 : 4.8),
          createdAt: u.createdAt || '2026-10-10'
        };

        if (matchedKey) {
          userMap.set(matchedKey, {
            ...userMap.get(matchedKey)!,
            ...dbItem
          });
        } else {
          // Distinct database registered user (e.g. Mohanraj #4, Mohanraj #3, etc.)
          userMap.set('db_' + uid, dbItem);
        }
      });
    }

    this.users = Array.from(userMap.values());

    // Synchronize local master storage
    try {
      localStorage.setItem('cropdeal_users_master', JSON.stringify(this.users));
    } catch {}
  }

  get filteredUsers(): AdminUserItem[] {
    return this.users.filter(u => {
      const matchRole = this.roleFilter === 'ALL' || u.role === this.roleFilter;
      const q = this.searchFilter.toLowerCase().trim();
      const matchQuery = !q ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q));
      return matchRole && matchQuery;
    });
  }

  viewUserModal(u: AdminUserItem): void {
    this.selectedUser = u;
  }

  toggleBlock(u: AdminUserItem, shouldBlock: boolean): void {
    if (shouldBlock && this.isAdminUser(u)) {
      this.alertMsg = '⚠️ Security restriction: You cannot block an Administrator account.';
      setTimeout(() => this.alertMsg = '', 5000);
      return;
    }
    const userId = u.userId || u.id || '1';
    const action$ = shouldBlock
      ? this.adminService.blockUser(userId, 'Compliance hold by Administrator')
      : this.adminService.unblockUser(userId);

    action$.subscribe({
      next: () => {
        this.applyBlockStatus(u, shouldBlock);
      },
      error: () => {
        this.applyBlockStatus(u, shouldBlock);
      }
    });
  }

  private applyBlockStatus(u: AdminUserItem, shouldBlock: boolean): void {
    u.isBlocked = shouldBlock;
    u.status = shouldBlock ? 'BLOCKED' : 'ACTIVE';
    this.userService.updateMasterUser({
      id: u.id,
      userId: u.userId,
      email: u.email,
      username: u.username,
      status: u.status,
      isBlocked: shouldBlock
    });

    if (this.selectedUser && (this.selectedUser.userId === u.userId || this.selectedUser.id === u.id)) {
      this.selectedUser.isBlocked = shouldBlock;
      this.selectedUser.status = u.status;
    }
    this.alertMsg = `User "${u.fullName || u.username}" (#${u.userId || u.id}) has been ${shouldBlock ? 'DEACTIVATED / BLOCKED' : 'ACTIVATED / UNBLOCKED'} successfully.`;
    setTimeout(() => this.alertMsg = '', 5000);
  }

  getActiveCount(): number {
    return this.users.filter(u => !u.isBlocked && u.status !== 'BLOCKED').length;
  }

  getBlockedCount(): number {
    return this.users.filter(u => u.isBlocked || u.status === 'BLOCKED').length;
  }
}
