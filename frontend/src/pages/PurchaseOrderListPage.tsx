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
  Checkbox,
  Alert,
  CircularProgress
} from '@mui/material';
import { LocalShipping as PurchaseOrderIcon, Add as AddIcon } from '@mui/icons-material';
import { Order, Supplier } from '../types';
import { purchaseOrderService } from '../services/purchaseOrder.service';
import { useAuth } from '../contexts/AuthContext';

const PurchaseOrderListPage: React.FC = () => {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 発注作成ダイアログ
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  // フィルター
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersResult, suppliersResult] = await Promise.all([
        purchaseOrderService.getAvailableOrders({
          storeId: user?.store?.id,
          customerName: customerFilter || undefined,
          fromDate: dateFromFilter || undefined,
          toDate: dateToFilter || undefined
        }),
        purchaseOrderService.getSuppliers()
      ]);

      setAvailableOrders(ordersResult.data || []);
      setSuppliers(suppliersResult.data || []);
    } catch (error: any) {
      console.error('データの読み込みに失敗しました:', error);
      setError('データの読み込みに失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === availableOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(availableOrders.map(order => order.id));
    }
  };

  const handleOpenConfirmDialog = () => {
    if (!selectedSupplierId || selectedOrders.length === 0) {
      setError('仕入先と受注を選択してください');
      return;
    }
    setCreateDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleCreatePurchaseOrder = async () => {
    try {
      setCreating(true);
      setError(null);

      const result = await purchaseOrderService.createPurchaseOrder({
        supplierId: selectedSupplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        orderIds: selectedOrders
      });

      if (result.success && result.data) {
        setSuccess('発注を作成しました: ' + result.data.purchaseOrderNumber);
        setConfirmDialogOpen(false);
        setSelectedOrders([]);
        setSelectedSupplierId('');
        setExpectedDeliveryDate('');
        setNotes('');
        await loadData(); // データを再読み込み
      } else {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || '発注の作成に失敗しました';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('発注作成エラー:', error);
      setError('発注の作成に失敗しました: ' + (error.message || '不明なエラー'));
    } finally {
      setCreating(false);
    }
  };

  const getSelectedOrdersTotal = () => {
    return selectedOrders.reduce((total, orderId) => {
      const order = availableOrders.find(o => o.id === orderId);
      const orderCostTotal = order?.items?.reduce((itemTotal, item) => {
        return itemTotal + ((item.product?.costPrice || 0) * item.quantity);
      }, 0) || 0;
      return total + orderCostTotal;
    }, 0);
  };

  const getSelectedOrdersDetails = () => {
    return availableOrders.filter(order => selectedOrders.includes(order.id));
  };

  const getOrderStatusChip = (status: string) => {
    const statusMap = {
      prescription_done: { label: '処方箋完了', color: 'warning' as const },
      ordered: { label: '受注済み', color: 'info' as const },
      in_production: { label: '製作中', color: 'primary' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: 'default' as const };
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PurchaseOrderIcon sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1">
          発注管理
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

      {/* フィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          絞り込み
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="顧客名"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="受注日(開始)"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="受注日(終了)"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={loadData}
              sx={{ height: '56px' }}
            >
              検索
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 発注待ち受注一覧 */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            発注待ち受注一覧 ({availableOrders.length}件)
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={selectedOrders.length === 0}
            onClick={() => setCreateDialogOpen(true)}
          >
            発注作成 ({selectedOrders.length}件選択中)
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedOrders.length === availableOrders.length && availableOrders.length > 0}
                    indeterminate={selectedOrders.length > 0 && selectedOrders.length < availableOrders.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>受注番号</TableCell>
                <TableCell>顧客名</TableCell>
                <TableCell>受注日</TableCell>
                <TableCell>金額</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>商品</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    発注待ちの受注はありません
                  </TableCell>
                </TableRow>
              ) : (
                availableOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleOrderSelection(order.id)}
                      />
                    </TableCell>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{order.customer?.fullName || '不明'}</TableCell>
                    <TableCell>{formatDate(order.orderDate)}</TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>{getOrderStatusChip(order.status)}</TableCell>
                    <TableCell>
                      {order.items?.map(item => item.product?.name).join(', ') || '商品情報なし'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 発注作成ダイアログ */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>発注作成</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>仕入先</InputLabel>
                <Select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  label="仕入先"
                >
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.supplierCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="納期予定日"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="備考"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                選択中の受注: {selectedOrders.length}件
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {selectedOrders.map(orderId => {
                  const order = availableOrders.find(o => o.id === orderId);
                  return order ? (
                    <Typography key={orderId} variant="body2">
                      • {order.orderNumber} - {order.customer?.fullName} ({formatCurrency(order.totalAmount)})
                    </Typography>
                  ) : null;
                })}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleOpenConfirmDialog}
            variant="contained"
            color="primary"
            disabled={!selectedSupplierId || selectedOrders.length === 0}
          >
            次へ（確認画面）
          </Button>
        </DialogActions>
      </Dialog>

      {/* 発注確認ダイアログ */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>発注内容の確認</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            以下の内容で発注を作成します。内容をご確認ください。
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold">
                仕入先情報
              </Typography>
              <Box sx={{ pl: 2, mt: 1 }}>
                <Typography variant="body2">
                  {suppliers.find(s => s.id === selectedSupplierId)?.name} 
                  ({suppliers.find(s => s.id === selectedSupplierId)?.supplierCode})
                </Typography>
                {expectedDeliveryDate && (
                  <Typography variant="body2">
                    納期予定日: {expectedDeliveryDate}
                  </Typography>
                )}
                {notes && (
                  <Typography variant="body2">
                    備考: {notes}
                  </Typography>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold">
                発注明細 ({selectedOrders.length}件)
              </Typography>
              <TableContainer sx={{ mt: 1, maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>受注番号</TableCell>
                      <TableCell>顧客名</TableCell>
                      <TableCell>商品コード</TableCell>
                      <TableCell>商品名</TableCell>
                      <TableCell align="right">数量</TableCell>
                      <TableCell align="right">仕入単価</TableCell>
                      <TableCell align="right">仕入金額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getSelectedOrdersDetails().map((order) => (
                      order.items?.map((item, itemIndex) => (
                        <TableRow key={`${order.id}-${itemIndex}`}>
                          {itemIndex === 0 && (
                            <>
                              <TableCell rowSpan={order.items?.length || 1}>
                                {order.orderNumber}
                              </TableCell>
                              <TableCell rowSpan={order.items?.length || 1}>
                                {order.customer?.fullName}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{item.product?.productCode || '不明'}</TableCell>
                          <TableCell>{item.product?.name || '不明'}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.product?.costPrice || 0)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency((item.product?.costPrice || 0) * item.quantity)}
                          </TableCell>
                        </TableRow>
                      )) || []
                    )).flat()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1
              }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  合計仕入金額
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(getSelectedOrdersTotal())}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setConfirmDialogOpen(false);
              setCreateDialogOpen(true);
            }}
          >
            戻る
          </Button>
          <Button
            onClick={handleCreatePurchaseOrder}
            variant="contained"
            color="primary"
            disabled={creating}
          >
            {creating ? <CircularProgress size={20} /> : '発注を確定'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseOrderListPage;