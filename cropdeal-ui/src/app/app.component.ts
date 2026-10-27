import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'cropdeal-ui';

  ngOnInit(): void {
    const CLEAN_KEY_V15 = 'cropdeal_zero_seed_clean_v15';
    if (!localStorage.getItem(CLEAN_KEY_V15)) {
      localStorage.removeItem('cropdeal_users_master');
      localStorage.removeItem('cropdeal_farmer_reviews');
      localStorage.removeItem('cropdeal_reviews');
      localStorage.removeItem('cropdeal_orders_cache');
      localStorage.removeItem('cropdeal_orders');
      localStorage.removeItem('cropdeal_crops_cache');
      localStorage.removeItem('cropdeal_crops');
      localStorage.removeItem('cropdeal_bidding_auctions');
      localStorage.removeItem('cropdeal_deleted_bidding_ids');
      localStorage.removeItem('cropdeal_active_deliveries');
      localStorage.removeItem('cropdeal_deliveries');
      localStorage.removeItem('cropdeal_negotiations');
      localStorage.removeItem('cropdeal_subscriptions');
      localStorage.removeItem('cropdeal_admin_reports');
      localStorage.removeItem('cropdeal_biddings_storage');
      localStorage.removeItem('cropdeal_cart');
      localStorage.removeItem('cropdeal_auth_user');
      localStorage.removeItem('cropdeal_token');
      localStorage.removeItem('cropdeal_profile_cache');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (
            k.startsWith('cropdeal_wallet_') ||
            k.startsWith('cropdeal_txns_') ||
            k.startsWith('cropdeal_notifications_') ||
            k.startsWith('cropdeal_subscriptions_')
          )) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
      localStorage.setItem(CLEAN_KEY_V15, 'true');
    }
  }
}
