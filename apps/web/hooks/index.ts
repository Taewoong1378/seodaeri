// Dashboard hooks
export {
  useDashboard,
  useSyncPortfolio,
  useInvalidateDashboard,
  defaultDashboardData,
} from './use-dashboard';

// Transaction hooks
export {
  useTransactions,
  useSaveDeposit,
  useSaveDividend,
  useSaveDividends,
  useSaveTradeTransactions,
  useInvalidateTransactions,
} from './use-transactions';

// Deposit hooks
export {
  useAccountList,
  useAutoDepositSetting,
  useSaveAutoDepositSetting,
} from './use-deposit';

// Re-export types
export type { Transaction, TransactionsResult } from './use-transactions';
export type { DashboardData } from '../app/actions/dashboard';
export type { AutoDepositSetting } from './use-deposit';
