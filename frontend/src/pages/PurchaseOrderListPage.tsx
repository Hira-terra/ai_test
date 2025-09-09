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
  CircularProgress,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Stack,
  Divider
} from '@mui/material';
import { 
  LocalShipping as PurchaseOrderIcon, 
  Add as AddIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Send as SendIcon
} from '@mui/icons-material';
import { Order, Supplier, OrderItem } from '../types';
import { purchaseOrderService } from '../services/purchaseOrder.service';
import { useAuth } from '../contexts/AuthContext';

export default function PurchaseOrderListPage() {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedOrderItems, setSelectedOrderItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  // 発注作成ダイアログ
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // 発注確認画面での最終選択
  const [finalSelectedItems, setFinalSelectedItems] = useState<Set<string>>(new Set());

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

  const handleOrderItemSelection = (orderId: string, itemId: string) => {
    const key = `${orderId}-${itemId}`;
    setSelectedOrderItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelectAllItems = (orderId: string) => {
    const order = availableOrders.find(o => o.id === orderId);
    if (!order) return;

    const orderItemKeys = order.items?.map(item => `${orderId}-${item.id}`) || [];
    const allSelected = orderItemKeys.every(key => selectedOrderItems.has(key));

    setSelectedOrderItems(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        orderItemKeys.forEach(key => newSet.delete(key));
      } else {
        orderItemKeys.forEach(key => newSet.add(key));
      }
      return newSet;
    });
  };

  const handleToggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleOpenConfirmDialog = () => {
    if (!selectedSupplierId || selectedOrderItems.size === 0) {
      setError('仕入先と商品を選択してください');
      return;
    }
    // 選択されたアイテムを最終選択にコピー
    setFinalSelectedItems(new Set(selectedOrderItems));
    setCreateDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleCreatePurchaseOrder = async () => {
    try {
      setCreating(true);
      setError(null);

      // 最終選択された商品から受注IDを抽出（重複を除く）
      const orderIds = new Set<string>();
      finalSelectedItems.forEach(key => {
        const orderId = key.substring(0, 36);
        orderIds.add(orderId);
      });

      const result = await purchaseOrderService.createPurchaseOrder({
        supplierId: selectedSupplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        orderIds: Array.from(orderIds)
      });

      if (result.success && result.data) {
        setSuccess('発注を作成しました: ' + result.data.purchaseOrderNumber);
        setConfirmDialogOpen(false);
        setSelectedOrderItems(new Set());
        setFinalSelectedItems(new Set());
        setSelectedSupplierId('');
        setExpectedDeliveryDate('');
        setNotes('');
        await loadData();
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

  const getSelectedItemsTotal = () => {
    let total = 0;
    selectedOrderItems.forEach(key => {
      // UUID形式のキーを正しく分割
      const orderId = key.substring(0, 36);
      const itemId = key.substring(37);
      const order = availableOrders.find(o => o.id === orderId);
      const item = order?.items?.find(i => i.id === itemId);
      if (item) {
        total += (item.product?.costPrice || 0) * item.quantity;
      }
    });
    return total;
  };

  const getSelectedItemsDetails = () => {
    const details: Array<{order: Order, item: OrderItem}> = [];
    
    selectedOrderItems.forEach(key => {
      // UUID形式のキーを正しく分割（36文字のUUID + ハイフン + 36文字のUUID）
      const orderId = key.substring(0, 36);
      const itemId = key.substring(37);
      
      const order = availableOrders.find(o => o.id === orderId);
      const item = order?.items?.find(i => i.id === itemId);
      
      if (order && item) {
        details.push({ order, item });
      }
    });
    
    return details;
  };

  const getFinalSelectedItemsDetails = () => {
    const details: Array<{order: Order, item: OrderItem, key: string}> = [];
    
    finalSelectedItems.forEach(key => {
      // UUID形式のキーを正しく分割
      const orderId = key.substring(0, 36);
      const itemId = key.substring(37);
      
      const order = availableOrders.find(o => o.id === orderId);
      const item = order?.items?.find(i => i.id === itemId);
      
      if (order && item) {
        details.push({ order, item, key });
      }
    });
    
    return details;
  };

  const getFinalSelectedItemsTotal = () => {
    let total = 0;
    finalSelectedItems.forEach(key => {
      // UUID形式のキーを正しく分割
      const orderId = key.substring(0, 36);
      const itemId = key.substring(37);
      const order = availableOrders.find(o => o.id === orderId);
      const item = order?.items?.find(i => i.id === itemId);
      if (item) {
        total += (item.product?.costPrice || 0) * item.quantity;
      }
    });
    return total;
  };

  const handleFinalItemSelection = (key: string) => {
    setFinalSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getProductCategoryChip = (category?: string) => {
    const categoryMap = {
      lens: { label: 'レンズ', color: 'primary' as const },
      frame: { label: 'フレーム', color: 'secondary' as const },
      contact: { label: 'コンタクト', color: 'info' as const },
      accessory: { label: 'アクセサリー', color: 'success' as const },
      hearing_aid: { label: '補聴器', color: 'warning' as const }
    };
    
    const categoryInfo = categoryMap[category as keyof typeof categoryMap] || { label: category || '不明', color: 'default' as const };
    return <Chip label={categoryInfo.label} color={categoryInfo.color} size="small" />;
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
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              label="顧客名で検索"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="受注日から"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="受注日まで"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button 
              variant="outlined" 
              onClick={loadData}
              fullWidth
            >
              検索
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          発注待ち受注一覧（{availableOrders.length}件）
        </Typography>
        <Box>
          {selectedOrderItems.size > 0 && (
            <Typography variant="body2" sx={{ mr: 2, display: 'inline' }}>
              選択中: {selectedOrderItems.size}商品
            </Typography>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={selectedOrderItems.size === 0}
          >
            選択商品を発注
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>受注番号</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>受注日</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell align="right">商品数</TableCell>
              <TableCell align="right">仕入金額</TableCell>
              <TableCell align="center">選択</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const orderItems = order.items || [];
              const orderItemKeys = orderItems.map(item => `${order.id}-${item.id}`);
              const selectedCount = orderItemKeys.filter(key => selectedOrderItems.has(key)).length;
              const allSelected = selectedCount === orderItems.length && orderItems.length > 0;
              const partiallySelected = selectedCount > 0 && selectedCount < orderItems.length;
              
              return (
                <React.Fragment key={order.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleOrderExpand(order.id)}
                      >
                        {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{order.customer?.lastName} {order.customer?.firstName}</TableCell>
                    <TableCell>{formatDate(order.orderDate)}</TableCell>
                    <TableCell>{getOrderStatusChip(order.status)}</TableCell>
                    <TableCell align="right">{orderItems.length}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(
                        orderItems.reduce((total, item) => 
                          total + ((item.product?.costPrice || 0) * item.quantity), 0
                        )
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={partiallySelected}
                        onChange={() => handleSelectAllItems(order.id)}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            商品明細
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>選択</TableCell>
                                <TableCell>カテゴリー</TableCell>
                                <TableCell>商品コード</TableCell>
                                <TableCell>商品名</TableCell>
                                <TableCell>ブランド</TableCell>
                                <TableCell align="right">数量</TableCell>
                                <TableCell align="right">仕入単価</TableCell>
                                <TableCell align="right">仕入金額</TableCell>
                                <TableCell>処方箋</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {orderItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedOrderItems.has(`${order.id}-${item.id}`)}
                                      onChange={() => handleOrderItemSelection(order.id, item.id)}
                                    />
                                  </TableCell>
                                  <TableCell>{getProductCategoryChip(item.product?.category)}</TableCell>
                                  <TableCell>{item.product?.productCode || '-'}</TableCell>
                                  <TableCell>{item.product?.name || '-'}</TableCell>
                                  <TableCell>{item.product?.brand || '-'}</TableCell>
                                  <TableCell align="right">{item.quantity}</TableCell>
                                  <TableCell align="right">
                                    {formatCurrency(item.product?.costPrice || 0)}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatCurrency((item.product?.costPrice || 0) * item.quantity)}
                                  </TableCell>
                                  <TableCell>
                                    {item.prescriptionId ? (
                                      <Chip label="処方箋あり" size="small" color="info" />
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 発注作成ダイアログ */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>発注作成</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="info">
                {selectedOrderItems.size}個の商品が選択されています
              </Alert>
            </Grid>
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
                label="納品予定日"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="備考"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleOpenConfirmDialog} disabled={!selectedSupplierId}>
            確認画面へ
          </Button>
        </DialogActions>
      </Dialog>

      {/* 発注確認ダイアログ */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>発注内容確認</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">仕入先</Typography>
                    <Typography variant="body1">
                      {suppliers.find(s => s.id === selectedSupplierId)?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">納品予定日</Typography>
                    <Typography variant="body1">
                      {expectedDeliveryDate || '未定'}
                    </Typography>
                  </Grid>
                  {notes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">備考</Typography>
                      <Typography variant="body1">{notes}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <Typography variant="h6">発注商品明細</Typography>
            <Alert severity="info" sx={{ mb: 1 }}>
              フレーム等で在庫品がある場合は、発注不要な商品のチェックを外してください
            </Alert>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">発注</TableCell>
                    <TableCell>受注番号</TableCell>
                    <TableCell>顧客名</TableCell>
                    <TableCell>カテゴリー</TableCell>
                    <TableCell>商品コード</TableCell>
                    <TableCell>商品名</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">仕入単価</TableCell>
                    <TableCell align="right">仕入金額</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getSelectedItemsDetails().map(({ order, item }) => {
                    const key = `${order.id}-${item.id}`;
                    const isSelected = finalSelectedItems.has(key);
                    return (
                      <TableRow key={key}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleFinalItemSelection(key)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>{order.orderNumber}</TableCell>
                        <TableCell>{order.customer?.lastName} {order.customer?.firstName}</TableCell>
                        <TableCell>{getProductCategoryChip(item.product?.category)}</TableCell>
                        <TableCell>{item.product?.productCode || '-'}</TableCell>
                        <TableCell>{item.product?.name || '-'}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.product?.costPrice || 0)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency((item.product?.costPrice || 0) * item.quantity)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                選択済み: {finalSelectedItems.size}商品
              </Typography>
              <Typography variant="h6">
                発注合計金額: {formatCurrency(getFinalSelectedItemsTotal())}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>戻る</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCreatePurchaseOrder}
            disabled={creating || finalSelectedItems.size === 0}
          >
            {creating ? <CircularProgress size={24} /> : '発注確定'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}