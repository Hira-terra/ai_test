// Page ID: S-004 受注一覧ページ
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CompleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Assignment as PrescriptionAddIcon,
} from '@mui/icons-material';
import { Order, OrderStatus, PaymentMethod, PaginationInfo } from '@/types';
import { orderService } from '@/services/order.service';

const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  
  // データ状態
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  
  // フィルタ状態
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  // デフォルトで今日の受注を表示
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  
  // UI状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  
  // 入金追加ダイアログ状態
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // 処方箋入力ダイアログ状態
  const [prescriptionDialog, setPrescriptionDialog] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    rightEyeSphere: '',
    rightEyeCylinder: '',
    rightEyeAxis: '',
    rightEyeVision: '',
    leftEyeSphere: '',
    leftEyeCylinder: '',
    leftEyeAxis: '',
    leftEyeVision: '',
    pupilDistance: '',
    measuredDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);

  // 初期化 - ページ読み込み時に今日の受注を表示
  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ページ変更時のデータ読み込み
  useEffect(() => {
    if (pagination.page > 1) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // @MOCK_TO_API: 受注一覧取得
      const response = await orderService.getOrders({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
      });
      
      if (response.success && response.data) {
        setOrders(response.data);
        if (response.meta?.pagination) {
          setPagination(response.meta.pagination);
        }
      } else {
        throw new Error(response.error?.message || '受注一覧の取得に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // 検索条件の確認
    const hasSearchConditions = searchQuery || statusFilter || paymentFilter || dateFrom || dateTo;
    
    if (!hasSearchConditions) {
      setError('検索条件を入力してください。受注番号、顧客名、ステータス、期間などの条件を指定してから検索ボタンを押してください。');
      return;
    }
    
    // 検索条件が曖昧な場合の警告
    if (searchQuery && searchQuery.length < 2 && !statusFilter && !paymentFilter && !dateFrom) {
      setError('検索キーワードが短すぎます。受注番号（例：O-001）または顧客名（例：山田）を2文字以上入力するか、他の条件も組み合わせて検索してください。');
      return;
    }
    
    setError(null);
    setPagination(prev => ({ ...prev, page: 1 }));
    loadOrders();
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPagination(prev => ({ ...prev, page: value }));
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialog(true);
  };

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    try {
      // @MOCK_TO_API: 受注ステータス更新
      const response = await orderService.updateOrder(orderId, { status });
      
      if (response.success) {
        await loadOrders(); // データ再読み込み
      } else {
        throw new Error(response.error?.message || 'ステータス更新に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'ordered': return 'info';
      case 'prescription_done': return 'primary';
      case 'purchase_ordered': return 'secondary';
      case 'lens_received': return 'info';
      case 'in_production': return 'warning';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'ordered': return '受注済';
      case 'prescription_done': return '処方箋完了';
      case 'purchase_ordered': return '発注済み';
      case 'lens_received': return 'レンズ入荷済み';
      case 'in_production': return '製作中';
      case 'delivered': return 'お渡し完了';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return '現金';
      case 'credit': return 'クレジットカード';
      case 'electronic': return '電子マネー';
      case 'receivable': return '売掛';
      default: return method;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { 
      style: 'currency', 
      currency: 'JPY' 
    }).format(amount);
  };

  // 入金追加処理
  // 処方箋入力ダイアログを開く
  const handleOpenPrescriptionDialog = (order: Order) => {
    setSelectedOrder(order);
    setPrescriptionDialog(true);
  };

  // 処方箋保存処理
  const handleSavePrescription = async () => {
    if (!selectedOrder || !selectedOrder.customer) return;
    
    setPrescriptionLoading(true);
    setError(null);
    
    try {
      const { customerService } = await import('@/services/customer.service');
      
      const prescriptionData = {
        customerId: selectedOrder.customer.id,
        rightEyeSphere: prescriptionForm.rightEyeSphere ? parseFloat(prescriptionForm.rightEyeSphere) : null,
        rightEyeCylinder: prescriptionForm.rightEyeCylinder ? parseFloat(prescriptionForm.rightEyeCylinder) : null,
        rightEyeAxis: prescriptionForm.rightEyeAxis ? parseInt(prescriptionForm.rightEyeAxis) : null,
        rightEyeVision: prescriptionForm.rightEyeVision ? parseFloat(prescriptionForm.rightEyeVision) : null,
        leftEyeSphere: prescriptionForm.leftEyeSphere ? parseFloat(prescriptionForm.leftEyeSphere) : null,
        leftEyeCylinder: prescriptionForm.leftEyeCylinder ? parseFloat(prescriptionForm.leftEyeCylinder) : null,
        leftEyeAxis: prescriptionForm.leftEyeAxis ? parseInt(prescriptionForm.leftEyeAxis) : null,
        leftEyeVision: prescriptionForm.leftEyeVision ? parseFloat(prescriptionForm.leftEyeVision) : null,
        pupilDistance: prescriptionForm.pupilDistance ? parseFloat(prescriptionForm.pupilDistance) : null,
        measuredDate: prescriptionForm.measuredDate + 'T00:00:00.000Z', // ISO形式に変換
        notes: prescriptionForm.notes || null
      } as any;

      
      const result = await customerService.createPrescription(selectedOrder.customer.id, prescriptionData);
      
      if (result.success) {
        // 処方箋が保存されたら受注ステータスを更新
        const hasLensProducts = selectedOrder.items.some(item => 
          item.product?.category === 'lens' || 
          item.product?.productCode?.startsWith('LENS') ||
          item.product?.name?.includes('レンズ')
        );
        if (hasLensProducts) {
          await orderService.updateOrder(selectedOrder.id, { status: 'prescription_done' });
        }
        
        setPrescriptionDialog(false);
        // フォームをリセット
        setPrescriptionForm({
          rightEyeSphere: '',
          rightEyeCylinder: '',
          rightEyeAxis: '',
          rightEyeVision: '',
          leftEyeSphere: '',
          leftEyeCylinder: '',
          leftEyeAxis: '',
          leftEyeVision: '',
          pupilDistance: '',
          measuredDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        
        // 受注一覧を再読み込み
        loadOrders();
        alert('処方箋が保存されました。レンズ商品を含む受注のステータスが更新されました。');
      } else {
        setError(result.error?.message || '処方箋の保存に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message || '処方箋の保存中にエラーが発生しました。');
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedOrder) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('正しい金額を入力してください。');
      return;
    }
    
    if (amount > selectedOrder.balanceAmount) {
      setError('入金額が残金を超えています。');
      return;
    }
    
    setPaymentLoading(true);
    setError(null);
    
    try {
      const result = await orderService.addPayment(selectedOrder.id, {
        paymentAmount: amount,
        paymentMethod,
        notes: paymentNotes
      });
      
      if (result.success) {
        // 受注詳細を再取得して入金額を更新
        const orderResult = await orderService.getOrderById(selectedOrder.id);
        if (orderResult.success) {
          setSelectedOrder(orderResult.data!);
          // 受注一覧も再読み込み
          loadOrders();
        }
        
        // ダイアログを閉じてフォームをリセット
        setPaymentDialog(false);
        setPaymentAmount('');
        setPaymentNotes('');
      } else {
        setError(result.error?.message || '入金の追加に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message || '入金の追加中にエラーが発生しました。');
    } finally {
      setPaymentLoading(false);
    }
  };

  // 入金追加ダイアログを開く
  const handleOpenPaymentDialog = () => {
    setPaymentAmount('');
    setPaymentNotes('');
    setError(null);
    setPaymentDialog(true);
  };

  return (
    <Box>
      {/* @MOCK_UI: モック使用バナー */}
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          受注管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/orders/new')}
        >
          新規受注
        </Button>
      </Box>

      {/* 検索・フィルタエリア */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            検索条件を入力して「検索」ボタンを押してください。複数条件を組み合わせることで、より絞り込んだ検索が可能です。
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="受注番号・顧客名検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="O-001 または 山田太郎"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={statusFilter}
                  label="ステータス"
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="ordered">受注済</MenuItem>
                  <MenuItem value="prescription_done">処方箋完了</MenuItem>
                  <MenuItem value="purchase_ordered">発注済み</MenuItem>
                  <MenuItem value="lens_received">レンズ入荷済み</MenuItem>
                  <MenuItem value="in_production">製作中</MenuItem>
                  <MenuItem value="delivered">お渡し完了</MenuItem>
                  <MenuItem value="cancelled">キャンセル</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>支払方法</InputLabel>
                <Select
                  value={paymentFilter}
                  label="支払方法"
                  onChange={(e) => setPaymentFilter(e.target.value as PaymentMethod)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="cash">現金</MenuItem>
                  <MenuItem value="credit">クレジットカード</MenuItem>
                  <MenuItem value="electronic">電子マネー</MenuItem>
                  <MenuItem value="receivable">売掛</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="受注日（から）"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="受注日（まで）"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
                startIcon={<SearchIcon />}
              >
                検索
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 受注一覧テーブル */}
      <Card>
        <CardContent>
          {!searchQuery && !statusFilter && !paymentFilter && !dateFrom && !dateTo && orders.length === 0 && !loading ? (
            <Box textAlign="center" py={4}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                検索条件を指定してください
              </Typography>
              <Typography variant="body2" color="text.secondary">
                受注番号、顧客名、ステータス、期間などの条件を入力して検索ボタンを押してください。
              </Typography>
            </Box>
          ) : (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">受注一覧</Typography>
                <Typography variant="body2" color="text.secondary">
                  {pagination.total}件見つかりました
                </Typography>
              </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>受注番号</TableCell>
                  <TableCell>受注日</TableCell>
                  <TableCell>顧客名</TableCell>
                  <TableCell>担当者</TableCell>
                  <TableCell>商品数</TableCell>
                  <TableCell align="right">金額</TableCell>
                  <TableCell align="right">入金額</TableCell>
                  <TableCell align="right">残金</TableCell>
                  <TableCell>支払方法</TableCell>
                  <TableCell>納期</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {order.orderDate.split('T')[0]}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {order.customer?.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.customer?.customerCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {order.createdByUser?.name || '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.createdByUser?.userCode || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {order.items.length}点
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(order.paidAmount)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        color={order.balanceAmount > 0 ? 'error' : 'success'}
                        fontWeight="bold"
                      >
                        {formatCurrency(order.balanceAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </TableCell>
                    <TableCell>
                      {order.deliveryDate ? order.deliveryDate.split('T')[0] : '未定'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(order.status)}
                        color={getStatusColor(order.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="詳細表示">
                          <IconButton
                            size="small"
                            onClick={() => handleViewOrder(order)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {/* レンズ商品があり、まだ処方箋が完了していない場合のみ処方箋入力ボタンを表示 */}
                        {order.items.some(item => 
                          item.product?.category === 'lens' || 
                          item.product?.productCode?.startsWith('LENS') ||
                          item.product?.name?.includes('レンズ')
                        ) && order.status === 'ordered' && (
                          <Tooltip title="処方箋入力">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleOpenPrescriptionDialog(order)}
                            >
                              <PrescriptionAddIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.status === 'ordered' && (
                          <Tooltip title="製作開始">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleStatusUpdate(order.id, 'in_production')}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.status === 'in_production' && (
                          <Tooltip title="完成">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleStatusUpdate(order.id, 'ready')}
                            >
                              <CompleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.status === 'ready' && (
                          <Tooltip title="お渡し完了">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleStatusUpdate(order.id, 'delivered')}
                            >
                              <ShippingIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 受注詳細ダイアログ */}
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          受注詳細 - {selectedOrder?.orderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2}>
              {/* 基本情報 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>基本情報</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography><strong>受注日:</strong> {selectedOrder.orderDate.split('T')[0]}</Typography>
                    <Typography><strong>納期:</strong> {selectedOrder.deliveryDate?.split('T')[0] || '未定'}</Typography>
                    <Typography><strong>ステータス:</strong> {getStatusLabel(selectedOrder.status)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography><strong>顧客名:</strong> {selectedOrder.customer?.fullName}</Typography>
                    <Typography><strong>担当者:</strong> {selectedOrder.createdByUser?.name || '-'}</Typography>
                    <Typography><strong>支払方法:</strong> {getPaymentMethodLabel(selectedOrder.paymentMethod)}</Typography>
                    <Typography><strong>店舗:</strong> {selectedOrder.store?.name}</Typography>
                  </Grid>
                </Grid>
              </Grid>
              
              {/* 商品明細 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>商品明細</Typography>
                <List>
                  {selectedOrder.items.map((item, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={item.product?.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">数量: {item.quantity}</Typography>
                            <Typography variant="body2">単価: {formatCurrency(item.unitPrice)}</Typography>
                            <Typography variant="body2">小計: {formatCurrency(item.totalPrice)}</Typography>
                            {item.notes && (
                              <Typography variant="body2" color="text.secondary">備考: {item.notes}</Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              {/* 金額情報 */}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" gutterBottom>金額情報</Typography>
                  {selectedOrder.balanceAmount > 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PaymentIcon />}
                      onClick={handleOpenPaymentDialog}
                    >
                      入金追加
                    </Button>
                  )}
                </Box>
                <Box>
                  <Typography>小計: {formatCurrency(selectedOrder.subtotalAmount)}</Typography>
                  <Typography>消費税: {formatCurrency(selectedOrder.taxAmount)}</Typography>
                  <Typography><strong>合計: {formatCurrency(selectedOrder.totalAmount)}</strong></Typography>
                  <Typography>入金額: {formatCurrency(selectedOrder.paidAmount)}</Typography>
                  <Typography color={selectedOrder.balanceAmount > 0 ? 'error' : 'success'}>
                    <strong>残金: {formatCurrency(selectedOrder.balanceAmount)}</strong>
                  </Typography>
                </Box>
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
            領収書印刷
          </Button>
        </DialogActions>
      </Dialog>

      {/* 入金追加ダイアログ */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>入金追加</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {selectedOrder && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                受注番号: {selectedOrder.orderNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                残金: {formatCurrency(selectedOrder.balanceAmount)}
              </Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="入金額"
                type="number"
                fullWidth
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
                }}
                helperText={selectedOrder ? `残金: ${formatCurrency(selectedOrder.balanceAmount)}` : ''}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>支払方法</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  label="支払方法"
                >
                  <MenuItem value="cash">現金</MenuItem>
                  <MenuItem value="credit">クレジットカード</MenuItem>
                  <MenuItem value="electronic">電子マネー</MenuItem>
                  <MenuItem value="receivable">売掛</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="備考"
                multiline
                rows={3}
                fullWidth
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="入金に関するメモがあれば記入してください"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)} disabled={paymentLoading}>
            キャンセル
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddPayment}
            disabled={paymentLoading || !paymentAmount}
          >
            {paymentLoading ? '処理中...' : '入金追加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 処方箋入力ダイアログ */}
      <Dialog
        open={prescriptionDialog}
        onClose={() => setPrescriptionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          処方箋入力 - {selectedOrder?.customer?.fullName}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* 右眼 */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                右眼 (R)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="球面度数 (S)"
                    type="number"
                    value={prescriptionForm.rightEyeSphere}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeSphere: e.target.value}))}
                    inputProps={{ step: "0.25" }}
                    InputProps={{ 
                      endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>D</Typography> 
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="円柱度数 (C)"
                    type="number"
                    value={prescriptionForm.rightEyeCylinder}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeCylinder: e.target.value}))}
                    inputProps={{ step: "0.25" }}
                    InputProps={{ 
                      endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>D</Typography> 
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="軸 (AX)"
                    type="number"
                    value={prescriptionForm.rightEyeAxis}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeAxis: e.target.value}))}
                    inputProps={{ min: "0", max: "180", step: "1" }}
                    InputProps={{ 
                      endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>°</Typography> 
                    }}
                    helperText="0-180の範囲で入力"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="矯正視力"
                    type="number"
                    value={prescriptionForm.rightEyeVision}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeVision: e.target.value}))}
                    inputProps={{ min: "0.01", max: "2.0", step: "0.01" }}
                    helperText="0.01-2.0の範囲で入力"
                  />
                </Grid>
              </Grid>
            </Grid>
            
            {/* 左眼 */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                左眼 (L)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="球面度数 (S)"
                    type="number"
                    value={prescriptionForm.leftEyeSphere}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeSphere: e.target.value}))}
                    inputProps={{ step: "0.25" }}
                    InputProps={{ 
                      endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>D</Typography> 
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="円柱度数 (C)"
                    type="number"
                    value={prescriptionForm.leftEyeCylinder}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeCylinder: e.target.value}))}
                    inputProps={{ step: "0.25" }}
                    InputProps={{ 
                      endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>D</Typography> 
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="軸 (AX)"
                    type="number"
                    value={prescriptionForm.leftEyeAxis}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeAxis: e.target.value}))}
                    inputProps={{ min: "0", max: "180", step: "1" }}
                    InputProps={{ 
                      endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>°</Typography> 
                    }}
                    helperText="0-180の範囲で入力"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="矯正視力"
                    type="number"
                    value={prescriptionForm.leftEyeVision}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeVision: e.target.value}))}
                    inputProps={{ min: "0.01", max: "2.0", step: "0.01" }}
                    helperText="0.01-2.0の範囲で入力"
                  />
                </Grid>
              </Grid>
            </Grid>
            
            {/* 瞳孔間距離・測定日・備考 */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="瞳孔間距離 (PD)"
                    type="number"
                    value={prescriptionForm.pupilDistance}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, pupilDistance: e.target.value}))}
                    inputProps={{ min: "20", max: "85", step: "0.5" }}
                    InputProps={{ 
                      endAdornment: <Typography sx={{ ml: 1, color: 'text.secondary' }}>mm</Typography> 
                    }}
                    helperText="20-85mmの範囲で入力"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="測定日"
                    type="date"
                    value={prescriptionForm.measuredDate}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, measuredDate: e.target.value}))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="備考"
                    multiline
                    rows={2}
                    value={prescriptionForm.notes}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, notes: e.target.value}))}
                    placeholder="処方箋に関するメモがあれば記入してください"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrescriptionDialog(false)} disabled={prescriptionLoading}>
            キャンセル
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSavePrescription}
            disabled={prescriptionLoading}
          >
            {prescriptionLoading ? '保存中...' : '処方箋保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderListPage;