export interface Wallet {
  id?: string;
  userId: string;
  balance: number;
  totalBalance?: number;
  reservedBalance?: number;
  availableBalance?: number;
  currency: string;
  updatedAt?: string;
}

export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'RESERVATION' | 'RELEASE' | 'PAYMENT' | 'REFUND';

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  amount: number;
  type: WalletTransactionType;
  description: string;
  referenceId?: string;
  orderId?: string;
  timestamp: string;
}
