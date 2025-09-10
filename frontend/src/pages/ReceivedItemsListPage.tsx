import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Card,
  CardContent,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { receivingAPIService } from '../services/api/receiving.service';
import { supplierAPIService } from '../services/api/supplier.service';
import { useAuth } from '../contexts/AuthContext';
import type { PurchaseOrder, Supplier, PurchaseOrderStatus } from '../types';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const statusMap: Record<PurchaseOrderStatus, { label: string; color: ChipColor }> = {
  draft: { label: '下書き', color: 'default' },
  sent: { label: '発注済み', color: 'primary' },
  confirmed: { label: '確認済み', color: 'info' },
  partially_delivered: { label: '一部納品', color: 'warning' },
  delivered: { label: '納品完了', color: 'success' },
  cancelled: { label: 'キャンセル', color: 'error' }
};

export const ReceivedItemsListPage: React.FC = () => {
  const { user } = useAuth();
  const [receivedOrders, setReceivedOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // フィルタ状態
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // ダイアログ状態
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    loadSuppliers();
    loadReceivedOrders();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const loadSuppliers = async () => {
    try {
      const response = await supplierAPIService.getAllSuppliers();
      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (err) {
      console.error('仕入先取得エラー:', err);
    }
  };

  const loadReceivedOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await receivingAPIService.getReceivedOrdersHistory({
        storeId: user?.store?.id,
        supplierId: supplierFilter || undefined,
        status: statusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      
      if (response.success && response.data) {
        // 入庫済み（delivered、partially_delivered）のみを表示
        const receivedOnly = response.data.filter(order => 
          order.status === 'delivered' || order.status === 'partially_delivered'
        );
        setReceivedOrders(receivedOnly);
      } else {
        setError('入庫済みデータの取得に失敗しました');
      }
    } catch (err: any) {
      console.error('入庫済みデータ取得エラー:', err);
      setError('入庫済みデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadReceivedOrders();
  };

  const handleViewDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDetailDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { 
      style: 'currency', 
      currency: 'JPY' 
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  // 統計情報の計算
  const totalReceivedOrders = receivedOrders.length;
  const totalAccountsPayable = receivedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const partiallyDeliveredCount = receivedOrders.filter(order => order.status === 'partially_delivered').length;
  const fullyDeliveredCount = receivedOrders.filter(order => order.status === 'delivered').length;

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <AccountBalanceIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h4" component="h1">
            入庫済み一覧
          </Typography>
        </Stack>
        <Typography variant="body1" color="textSecondary">
          入庫処理が完了した発注データの一覧です。買掛金額の確認と支払い状況を管理できます。
        </Typography>
      </Paper>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 統計情報 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                総入庫件数
              </Typography>
              <Typography variant="h4">
                {totalReceivedOrders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                総買掛金額
              </Typography>
              <Typography variant="h4" color="error.main">
                {formatCurrency(totalAccountsPayable)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                納品完了
              </Typography>
              <Typography variant="h4" color="success.main">
                {fullyDeliveredCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                一部納品
              </Typography>
              <Typography variant="h4" color="warning.main">
                {partiallyDeliveredCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 検索・フィルタエリア */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          検索・フィルタ
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>仕入先</InputLabel>
              <Select
                value={supplierFilter}
                label="仕入先"
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <MenuItem value="">すべて</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                label="ステータス"
                onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus)}
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="partially_delivered">一部納品</MenuItem>
                <MenuItem value="delivered">納品完了</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="入庫日（から）"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="入庫日（まで）"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              startIcon={<CalendarIcon />}
            >
              検索
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 入庫済み一覧テーブル */}
      <Paper>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            入庫済み発注一覧
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {totalReceivedOrders}件の入庫済み発注
          </Typography>
        </Box>

        <Divider />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>発注書番号</TableCell>
                <TableCell>仕入先</TableCell>
                <TableCell>発注日</TableCell>
                <TableCell>入庫日</TableCell>
                <TableCell align="right">発注金額</TableCell>
                <TableCell align="right">商品点数</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : receivedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    入庫済みの発注データがありません
                  </TableCell>
                </TableRow>
              ) : (
                receivedOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.purchaseOrderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.supplier?.name || '不明'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatDate(order.orderDate)}
                    </TableCell>
                    <TableCell>
                      {order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {order.items?.length || 0}点
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusMap[order.status].label}
                        color={statusMap[order.status].color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="詳細表示">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetail(order)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 詳細ダイアログ */}
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          入庫済み発注詳細 - {selectedOrder?.purchaseOrderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={3}>
              {/* 基本情報 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>基本情報</Typography>
                <Typography><strong>発注書番号:</strong> {selectedOrder.purchaseOrderNumber}</Typography>
                <Typography><strong>仕入先:</strong> {selectedOrder.supplier?.name}</Typography>
                <Typography><strong>発注日:</strong> {formatDate(selectedOrder.orderDate)}</Typography>
                <Typography><strong>納期:</strong> {selectedOrder.expectedDeliveryDate ? formatDate(selectedOrder.expectedDeliveryDate) : '未設定'}</Typography>
                <Typography><strong>実際入庫日:</strong> {selectedOrder.actualDeliveryDate ? formatDate(selectedOrder.actualDeliveryDate) : '未入庫'}</Typography>
              </Grid>
              
              {/* 金額情報 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>金額情報</Typography>
                <Typography>小計: {formatCurrency(selectedOrder.subtotalAmount)}</Typography>
                <Typography>消費税: {formatCurrency(selectedOrder.taxAmount)}</Typography>
                <Typography><strong>合計: {formatCurrency(selectedOrder.totalAmount)}</strong></Typography>
                <Typography>ステータス: <Chip
                  label={statusMap[selectedOrder.status].label}
                  color={statusMap[selectedOrder.status].color}
                  size="small"
                /></Typography>
              </Grid>
              
              {/* 商品明細 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>商品明細</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>商品名</TableCell>
                        <TableCell align="right">数量</TableCell>
                        <TableCell align="right">単価</TableCell>
                        <TableCell align="right">金額</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product?.name || '不明'}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.totalCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              
              {/* 備考 */}
              {selectedOrder.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>備考</Typography>
                  <Typography>{selectedOrder.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>閉じる</Button>
          <Button variant="contained" startIcon={<ReceiptIcon />}>
            買掛明細印刷
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};