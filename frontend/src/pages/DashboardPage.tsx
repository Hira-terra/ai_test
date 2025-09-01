import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import {
  People,
  ShoppingCart,
  AttachMoney,
  Store,
  Assessment,
  FileDownload,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MockBanner from '@/components/MockBanner';
import { mockDashboardService } from '@/services/mock/dashboard.service';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: string;
  trendDirection?: 'up' | 'down';
}

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

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, trendDirection }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="text.secondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
          {trend && (
            <Box display="flex" alignItems="center" mt={1}>
              {trendDirection === 'up' ? (
                <ArrowUpward sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
              ) : trendDirection === 'down' ? (
                <ArrowDownward sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
              ) : null}
              <Typography 
                variant="body2" 
                color={trendDirection === 'up' ? 'success.main' : trendDirection === 'down' ? 'error.main' : 'text.secondary'}
                fontWeight="bold"
              >
                {trend}
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // データ状態
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [storeRankings, setStoreRankings] = useState<StoreRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 初期化
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // @MOCK_TO_API: ダッシュボード集計データ取得
      const summaryResponse = await mockDashboardService.getSummary();
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      }
      
      // @MOCK_TO_API: 店舗ランキングデータ取得
      const rankingsResponse = await mockDashboardService.getStoreRankings();
      if (rankingsResponse.success && rankingsResponse.data) {
        setStoreRankings(rankingsResponse.data);
      }
    } catch (err: any) {
      setError(err.message || 'データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { 
      style: 'currency', 
      currency: 'JPY' 
    }).format(amount);
  };
  
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };
  
  const quickActions = [
    {
      title: '店舗管理',
      description: '店舗情報・スタッフ管理',
      path: '/stores',
      color: 'primary',
    },
    {
      title: 'ユーザー管理',
      description: 'システムユーザー管理',
      path: '/users',
      color: 'secondary',
    },
    {
      title: 'レポート出力',
      description: '売上・在庫レポート',
      path: '/reports',
      color: 'info',
    },
    {
      title: 'システム設定',
      description: 'マスタデータ管理',
      path: '/settings',
      color: 'warning',
    },
  ];

  return (
    <Box>
      {/* @MOCK_UI: モック使用時のバナー表示 */}
      <MockBanner message="本部ダッシュボード - モックデータを使用中" variant="info" />
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            本部ダッシュボード
          </Typography>
          <Typography variant="body1" color="text.secondary">
            全店舗統括管理 - {user?.name}さん
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownload />}
          color="primary"
        >
          レポート出力
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography color="text.secondary">データを読み込み中...</Typography>
        </Box>
      )}

      {/* 集計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="本日の全店舗売上"
            value={summary ? formatCurrency(summary.todaySales) : "¥0"}
            icon={<AttachMoney />}
            color="success"
            trend={summary ? `前日比 ${formatPercentage(summary.yesterdayComparison)}` : undefined}
            trendDirection={summary && summary.yesterdayComparison >= 0 ? 'up' : 'down'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="本日の来店客数"
            value={summary?.todayCustomers || 0}
            icon={<People />}
            color="primary"
            trend={`全${summary?.totalStores || 0}店舗合計`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="今月の受注件数"
            value={`${summary?.monthlyOrders || 0}件`}
            icon={<ShoppingCart />}
            color="info"
            trend={`進行中 ${summary?.activeOrders || 0}件`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="今月の粗利益率"
            value={summary ? `${summary.profitRate}%` : "0%"}
            icon={<Assessment />}
            color="secondary"
            trend={summary ? `前月比 ${formatPercentage(summary.monthlyComparison)}` : undefined}
            trendDirection={summary && summary.monthlyComparison >= 0 ? 'up' : 'down'}
          />
        </Grid>
      </Grid>

      {/* 店舗別売上ランキング */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            店舗別売上ランキング（今月）
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>順位</strong></TableCell>
                  <TableCell><strong>店舗名</strong></TableCell>
                  <TableCell align="right"><strong>売上高</strong></TableCell>
                  <TableCell align="right"><strong>前月比</strong></TableCell>
                  <TableCell align="right"><strong>粗利益率</strong></TableCell>
                  <TableCell align="center"><strong>操作</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {storeRankings.map((store) => (
                  <TableRow key={store.rank} hover>
                    <TableCell>
                      <Chip 
                        label={store.rank} 
                        color={store.rank <= 3 ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {store.storeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {store.storeCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(store.sales)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end">
                        {store.monthlyGrowth >= 0 ? (
                          <ArrowUpward sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                        ) : (
                          <ArrowDownward sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                        )}
                        <Typography 
                          variant="body2" 
                          color={store.monthlyGrowth >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {formatPercentage(store.monthlyGrowth)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {store.profitRate.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/stores/${store.storeCode}`)}
                      >
                        <Store />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      
      <Typography variant="h6" component="h2" gutterBottom fontWeight="bold">
        管理機能
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.title}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="div" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color={action.color as any}
                  onClick={() => navigate(action.path)}
                >
                  開く
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardPage;