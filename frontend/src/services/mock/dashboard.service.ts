// @MOCK_TO_API: API実装時にこのファイル全体をAPI呼び出しに置き換え
import { ApiResponse } from '@/types';

interface DashboardSummary {
  todaySales: number;
  todayCustomers: number;
  monthlyOrders: number;
  profitRate: number;
  yesterdayComparison: number;
  monthlyComparison: number;
  totalStores: number;
  activeOrders: number;
}

interface StoreRanking {
  rank: number;
  storeName: string;
  storeCode: string;
  sales: number;
  monthlyGrowth: number;
  profitRate: number;
}

// @MOCK_DATA: ダッシュボードモックデータ
const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  todaySales: 3420000,
  todayCustomers: 187,
  monthlyOrders: 142,
  profitRate: 68.5,
  yesterdayComparison: 8.3,
  monthlyComparison: -1.2,
  totalStores: 40,
  activeOrders: 89
};

const MOCK_STORE_RANKINGS: StoreRanking[] = [
  {
    rank: 1,
    storeName: '新宿本店',
    storeCode: 'STORE001',
    sales: 8234500,
    monthlyGrowth: 15.2,
    profitRate: 72.3
  },
  {
    rank: 2,
    storeName: '銀座店',
    storeCode: 'STORE002',
    sales: 6789200,
    monthlyGrowth: 8.7,
    profitRate: 69.8
  },
  {
    rank: 3,
    storeName: '横浜店',
    storeCode: 'STORE003',
    sales: 5432100,
    monthlyGrowth: -2.3,
    profitRate: 68.1
  },
  {
    rank: 4,
    storeName: '渋谷店',
    storeCode: 'STORE004',
    sales: 4987600,
    monthlyGrowth: 22.1,
    profitRate: 70.5
  },
  {
    rank: 5,
    storeName: '池袋店',
    storeCode: 'STORE005',
    sales: 4234800,
    monthlyGrowth: 5.6,
    profitRate: 67.9
  },
  {
    rank: 6,
    storeName: '品川店',
    storeCode: 'STORE006',
    sales: 3987650,
    monthlyGrowth: 12.4,
    profitRate: 66.2
  },
  {
    rank: 7,
    storeName: '秋葉原店',
    storeCode: 'STORE007',
    sales: 3654200,
    monthlyGrowth: -4.7,
    profitRate: 64.8
  },
  {
    rank: 8,
    storeName: '上野店',
    storeCode: 'STORE008',
    sales: 3321000,
    monthlyGrowth: 7.9,
    profitRate: 65.5
  }
];

// @MOCK_LOGIC: モック専用のダッシュボードサービス
export const mockDashboardService = {
  // @MOCK_TO_API: /api/dashboard/summary への GET リクエストに置き換え
  getSummary: async (): Promise<ApiResponse<DashboardSummary>> => {
    console.warn('🔧 Using MOCK data for dashboard summary');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      data: MOCK_DASHBOARD_SUMMARY
    };
  },

  // @MOCK_TO_API: /api/dashboard/store-rankings への GET リクエストに置き換え
  getStoreRankings: async (): Promise<ApiResponse<StoreRanking[]>> => {
    console.warn('🔧 Using MOCK data for store rankings');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      success: true,
      data: MOCK_STORE_RANKINGS
    };
  },

  // @MOCK_TO_API: /api/dashboard/sales-chart への GET リクエストに置き換え
  getSalesChart: async (period: 'daily' | 'weekly' | 'monthly'): Promise<ApiResponse<any>> => {
    console.warn('🔧 Using MOCK data for sales chart');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // @MOCK_DATA: チャート用サンプルデータ
    let chartData;
    if (period === 'daily') {
      chartData = {
        labels: ['1日', '2日', '3日', '4日', '5日', '6日', '7日'],
        datasets: [{
          label: '売上高',
          data: [2800000, 3200000, 2950000, 3100000, 2850000, 3400000, 3650000],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
        }]
      };
    } else if (period === 'weekly') {
      chartData = {
        labels: ['第1週', '第2週', '第3週', '第4週'],
        datasets: [{
          label: '売上高',
          data: [21500000, 23200000, 22800000, 24100000],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
        }]
      };
    } else {
      chartData = {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        datasets: [{
          label: '売上高',
          data: [85600000, 92400000, 88200000, 95100000, 89800000, 98500000],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
        }]
      };
    }
    
    return {
      success: true,
      data: chartData
    };
  }
};