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
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  History as HistoryIcon, 
  Visibility as ViewIcon,
  LocalShipping as ShippingIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { PurchaseOrder, Supplier, PurchaseOrderStatus } from '../types';
import { purchaseOrderService } from '../services/purchaseOrder.service';
import { useAuth } from '../contexts/AuthContext';

const PurchaseOrderHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // フィルター
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [user, supplierFilter, statusFilter, dateFromFilter, dateToFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersResult, suppliersResult] = await Promise.all([
        purchaseOrderService.getPurchaseOrderHistory({
          storeId: user?.store?.id,
          supplierId: supplierFilter || undefined,
          status: statusFilter || undefined,
          fromDate: dateFromFilter || undefined,
          toDate: dateToFilter || undefined
        }),
        purchaseOrderService.getSuppliers()
      ]);

      setPurchaseOrders(ordersResult.data || []);
      setSuppliers(suppliersResult.data || []);
    } catch (error: any) {
      console.error('発注履歴の読み込みに失敗しました:', error);
      setError('発注履歴の読み込みに失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (orderId: string) => {
    try {
      const result = await purchaseOrderService.getPurchaseOrderById(orderId);
      if (result.success && result.data) {
        setSelectedOrder(result.data);
        setDetailDialogOpen(true);
      }
    } catch (error: any) {
      setError('発注詳細の取得に失敗しました: ' + (error.message || '不明なエラー'));
    }
  };

  const handleSendPurchaseOrder = async (purchaseOrderId: string) => {
    try {
      setSending(purchaseOrderId);
      setError(null);

      const result = await purchaseOrderService.sendPurchaseOrder(purchaseOrderId);
      
      if (result.success) {
        setSuccess('発注を送信しました');
        await loadData(); // データを再読み込み
      } else {
        throw new Error(result.error?.message || '発注送信に失敗しました');
      }
    } catch (error: any) {
      console.error('発注送信エラー:', error);
      setError('発注送信に失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setSending(null);
    }
  };

  const getStatusChip = (status: PurchaseOrderStatus) => {
    const statusMap: Record<PurchaseOrderStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
      draft: { label: '下書き', color: 'default' as const },
      sent: { label: '発注済み', color: 'primary' as const },
      confirmed: { label: '確認済み', color: 'info' as const },
      partially_delivered: { label: '一部納品', color: 'warning' as const },
      delivered: { label: '納品完了', color: 'success' as const },
      cancelled: { label: 'キャンセル', color: 'error' as const }
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'default' as const };
    return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <HistoryIcon sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1">
          発注履歴
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          検索条件
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>仕入先</InputLabel>
              <Select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                label="仕入先"
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
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus)}
                label="ステータス"
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="draft">下書き</MenuItem>
                <MenuItem value="sent">発注済み</MenuItem>
                <MenuItem value="confirmed">確認済み</MenuItem>
                <MenuItem value="delivered">納品完了</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="発注日（開始）"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="発注日（終了）"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>発注番号</TableCell>
                  <TableCell>仕入先</TableCell>
                  <TableCell>発注日</TableCell>
                  <TableCell>納期予定日</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell align="right">発注金額</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      発注履歴はありません
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.purchaseOrderNumber}</TableCell>
                      <TableCell>{order.supplier?.name || '不明'}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>
                        {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '未設定'}
                      </TableCell>
                      <TableCell>{getStatusChip(order.status)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          startIcon={<ViewIcon />}
                          size="small"
                          onClick={() => handleViewDetail(order.id)}
                          sx={{ mr: 1 }}
                        >
                          詳細
                        </Button>
                        {order.status === 'draft' && (
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<SendIcon />}
                            onClick={() => handleSendPurchaseOrder(order.id)}
                            disabled={sending === order.id}
                          >
                            {sending === order.id ? <CircularProgress size={16} /> : '発注送信'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 発注詳細ダイアログ */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShippingIcon sx={{ mr: 1 }} />
            発注詳細: {selectedOrder?.purchaseOrderNumber}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  基本情報
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2">
                    発注番号: {selectedOrder.purchaseOrderNumber}
                  </Typography>
                  <Typography variant="body2">
                    仕入先: {selectedOrder.supplier?.name} ({selectedOrder.supplier?.supplierCode})
                  </Typography>
                  <Typography variant="body2">
                    発注日: {formatDate(selectedOrder.orderDate)}
                  </Typography>
                  <Typography variant="body2">
                    納期予定日: {selectedOrder.expectedDeliveryDate ? formatDate(selectedOrder.expectedDeliveryDate) : '未設定'}
                  </Typography>
                  <Typography variant="body2">
                    ステータス: {getStatusChip(selectedOrder.status)}
                  </Typography>
                  {selectedOrder.notes && (
                    <Typography variant="body2">
                      備考: {selectedOrder.notes}
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  金額情報
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2">
                    小計: {formatCurrency(selectedOrder.subtotalAmount)}
                  </Typography>
                  <Typography variant="body2">
                    税額: {formatCurrency(selectedOrder.taxAmount)}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    合計: {formatCurrency(selectedOrder.totalAmount)}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  発注明細
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>商品コード</TableCell>
                        <TableCell>商品名</TableCell>
                        <TableCell align="right">数量</TableCell>
                        <TableCell align="right">仕入単価</TableCell>
                        <TableCell align="right">仕入金額</TableCell>
                        <TableCell>備考</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.productCode || '不明'}</TableCell>
                          <TableCell>{item.product?.name || '不明'}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.unitCost)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.totalCost)}
                          </TableCell>
                          <TableCell>{item.notes || '-'}</TableCell>
                        </TableRow>
                      )) || []}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseOrderHistoryPage;