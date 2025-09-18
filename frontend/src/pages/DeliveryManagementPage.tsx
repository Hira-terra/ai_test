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
  Stack,
  FormControl,
  InputLabel,
  Select,
  Divider,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  IconButton,
  Badge,
} from '@mui/material';
import {
  LocalShipping as DeliveryIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Warning as WarningIcon,
  AccountBalance as AccountBalanceIcon,
  CreditCard as CreditCardIcon,
  MonetizationOn as CashIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import type { 
  DeliveryOrder, 
  DeliveryStatus, 
  PaymentRecord,
  PaymentMethod,
  DeliverySearchParams 
} from '../types';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const deliveryStatusMap: Record<DeliveryStatus, { label: string; color: ChipColor }> = {
  ready: { label: 'お渡し準備完了', color: 'primary' },
  scheduled: { label: 'お渡し予定', color: 'info' },
  delivered: { label: 'お渡し完了', color: 'success' },
  partial_delivery: { label: '一部お渡し', color: 'warning' },
  cancelled: { label: 'お渡しキャンセル', color: 'error' },
  returned: { label: '返品', color: 'error' }
};

const paymentStatusMap: Record<string, { label: string; color: ChipColor }> = {
  unpaid: { label: '未払い', color: 'error' },
  partial: { label: '一部入金', color: 'warning' },
  paid: { label: '支払い完了', color: 'success' },
  refunded: { label: '返金済み', color: 'info' }
};

const paymentMethodIcons: Record<PaymentMethod, React.ReactNode> = {
  cash: <CashIcon />,
  credit: <CreditCardIcon />,
  electronic: <AccountBalanceIcon />,
  receivable: <AccountBalanceIcon />
};

const deliverySteps = [
  { key: 'quality_check', label: '最終品質確認' },
  { key: 'notification', label: '顧客連絡' },
  { key: 'delivery', label: 'お渡し実行' },
  { key: 'payment', label: '決済完了' },
  { key: 'receipt', label: '領収書発行' }
];

export const DeliveryManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [filterDialog, setFilterDialog] = useState(false);
  const [filters, setFilters] = useState<DeliverySearchParams>({});
  
  // 決済関連の状態
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // お渡し予定の状態
  const [scheduledDate, setScheduledDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'store_pickup' | 'home_delivery' | 'mail'>('store_pickup');
  const [customerNotified, setCustomerNotified] = useState(false);

  useEffect(() => {
    if (user) {
      loadDeliveryOrders();
    }
  }, [user, filters]);

  const loadDeliveryOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: 実API実装待ち
      // 現在はデータが空の状態
      const deliveryOrders: DeliveryOrder[] = [];
      
      // フィルタリング処理
      let filteredData = deliveryOrders;
      if (filters.status) {
        filteredData = filteredData.filter(order => order.status === filters.status);
      }
      if (filters.paymentStatus) {
        filteredData = filteredData.filter(order => order.paymentStatus === filters.paymentStatus);
      }

      setDeliveryOrders(filteredData);
    } catch (err) {
      setError('お渡し・決済データの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setDetailDialog(true);
  };

  const handleOpenPayment = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setPaymentAmount(order.balanceAmount);
    setPaymentMethod('cash');
    setPaymentNotes('');
    setPaymentDialog(true);
  };

  const handleOpenSchedule = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setScheduledDate(order.scheduledDate || '');
    setDeliveryMethod(order.deliveryMethod);
    setCustomerNotified(order.customerNotified);
    setScheduleDialog(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedOrder || paymentAmount <= 0) return;

    try {
      // API実装後に置き換え
      console.log('決済処理:', {
        orderId: selectedOrder.id,
        amount: paymentAmount,
        method: paymentMethod,
        notes: paymentNotes
      });

      const newPaidAmount = selectedOrder.paidAmount + paymentAmount;
      const newBalanceAmount = selectedOrder.finalAmount - newPaidAmount;
      const newPaymentStatus = newBalanceAmount <= 0 ? 'paid' : 'partial';

      setDeliveryOrders(prev =>
        prev.map(order =>
          order.id === selectedOrder.id
            ? {
                ...order,
                paidAmount: newPaidAmount,
                balanceAmount: newBalanceAmount,
                paymentStatus: newPaymentStatus,
                paymentMethod: paymentMethod,
                paymentDate: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            : order
        )
      );

      setPaymentDialog(false);
      alert('決済処理が完了しました');
    } catch (err) {
      setError('決済処理に失敗しました');
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedOrder) return;

    try {
      // API実装後に置き換え
      console.log('お渡し予定更新:', {
        orderId: selectedOrder.id,
        scheduledDate,
        deliveryMethod,
        customerNotified
      });

      setDeliveryOrders(prev =>
        prev.map(order =>
          order.id === selectedOrder.id
            ? {
                ...order,
                scheduledDate,
                deliveryMethod,
                customerNotified,
                updatedAt: new Date().toISOString()
              }
            : order
        )
      );

      setScheduleDialog(false);
      alert('お渡し予定が更新されました');
    } catch (err) {
      setError('お渡し予定の更新に失敗しました');
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    try {
      // API実装後に置き換え
      console.log('お渡し完了:', orderId);

      setDeliveryOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? {
                ...order,
                status: 'delivered' as DeliveryStatus,
                actualDeliveryDate: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            : order
        )
      );

      alert('お渡し処理が完了しました');
    } catch (err) {
      setError('お渡し処理に失敗しました');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeliveryIcon />
          お渡し・決済管理
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            startIcon={<FilterListIcon />}
            variant="outlined"
            onClick={() => setFilterDialog(true)}
          >
            フィルタ
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={loadDeliveryOrders}
            disabled={loading}
          >
            更新
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                お渡し準備完了
              </Typography>
              <Typography variant="h4">
                {deliveryOrders.filter(o => o.status === 'ready').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                お渡し予定
              </Typography>
              <Typography variant="h4">
                {deliveryOrders.filter(o => o.status === 'scheduled').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                未収金額
              </Typography>
              <Typography variant="h4" color="error">
                {formatCurrency(deliveryOrders.reduce((sum, o) => sum + o.balanceAmount, 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                本日お渡し予定
              </Typography>
              <Typography variant="h4">
                {deliveryOrders.filter(o => {
                  if (!o.scheduledDate) return false;
                  const today = new Date().toDateString();
                  const scheduled = new Date(o.scheduledDate).toDateString();
                  return today === scheduled;
                }).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* お渡し・決済一覧 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>お渡し番号</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>お渡し予定</TableCell>
              <TableCell>金額</TableCell>
              <TableCell>入金状況</TableCell>
              <TableCell>お渡し方法</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveryOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {order.deliveryNumber}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {order.order?.orderNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  {order.order?.customer && (
                    <>
                      <Typography variant="body2">
                        {order.order.customer.lastName} {order.order.customer.firstName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {order.order.customer.phone}
                      </Typography>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={deliveryStatusMap[order.status].label}
                    color={deliveryStatusMap[order.status].color}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(order.scheduledDate)}
                  </Typography>
                  {order.customerNotified && (
                    <Chip label="連絡済み" color="info" size="small" sx={{ mt: 0.5 }} />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(order.finalAmount)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    入金: {formatCurrency(order.paidAmount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={paymentStatusMap[order.paymentStatus].label}
                    color={paymentStatusMap[order.paymentStatus].color}
                    size="small"
                  />
                  {order.balanceAmount > 0 && (
                    <Typography variant="caption" color="error" display="block">
                      残金: {formatCurrency(order.balanceAmount)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {order.deliveryMethod === 'store_pickup' ? '店舗受取' : 
                     order.deliveryMethod === 'home_delivery' ? '配送' : '郵送'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenDetail(order)}
                    >
                      詳細
                    </Button>
                    {order.status !== 'delivered' && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PaymentIcon />}
                          onClick={() => handleOpenPayment(order)}
                          color="primary"
                        >
                          決済
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ScheduleIcon />}
                          onClick={() => handleOpenSchedule(order)}
                        >
                          予定
                        </Button>
                      </>
                    )}
                    {(order.status === 'ready' || order.status === 'scheduled') && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CheckIcon />}
                        onClick={() => handleCompleteDelivery(order.id)}
                        color="success"
                      >
                        完了
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 詳細ダイアログ */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          お渡し・決済詳細 - {selectedOrder?.deliveryNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">顧客名</Typography>
                      <Typography variant="body1">
                        {selectedOrder.order?.customer?.lastName} {selectedOrder.order?.customer?.firstName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">お渡し番号</Typography>
                      <Typography variant="body1">{selectedOrder.deliveryNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">ステータス</Typography>
                      <Chip
                        label={deliveryStatusMap[selectedOrder.status].label}
                        color={deliveryStatusMap[selectedOrder.status].color}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">お渡し方法</Typography>
                      <Typography variant="body1">
                        {selectedOrder.deliveryMethod === 'store_pickup' ? '店舗受取' : 
                         selectedOrder.deliveryMethod === 'home_delivery' ? '配送' : '郵送'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">最終金額</Typography>
                      <Typography variant="h6">{formatCurrency(selectedOrder.finalAmount)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">決済状況</Typography>
                      <Typography variant="body1">
                        入金: {formatCurrency(selectedOrder.paidAmount)}<br/>
                        残金: {formatCurrency(selectedOrder.balanceAmount)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Typography variant="h6" gutterBottom>お渡し進捗</Typography>
              <Stepper activeStep={getDeliveryStep(selectedOrder)} alternativeLabel>
                {deliverySteps.map((step) => (
                  <Step key={step.key}>
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {selectedOrder.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">備考</Typography>
                  <Typography variant="body2">{selectedOrder.notes}</Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>閉じる</Button>
          <Button startIcon={<PrintIcon />} variant="outlined">
            領収書印刷
          </Button>
        </DialogActions>
      </Dialog>

      {/* 決済ダイアログ */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>決済処理</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                残金額: {formatCurrency(selectedOrder.balanceAmount)}
              </Alert>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="入金額"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    InputProps={{
                      startAdornment: '¥',
                    }}
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
                      <MenuItem value="cash">
                        <Box display="flex" alignItems="center" gap={1}>
                          {paymentMethodIcons.cash}
                          現金
                        </Box>
                      </MenuItem>
                      <MenuItem value="credit">
                        <Box display="flex" alignItems="center" gap={1}>
                          {paymentMethodIcons.credit}
                          クレジット
                        </Box>
                      </MenuItem>
                      <MenuItem value="electronic">
                        <Box display="flex" alignItems="center" gap={1}>
                          {paymentMethodIcons.electronic}
                          電子マネー
                        </Box>
                      </MenuItem>
                      <MenuItem value="receivable">
                        <Box display="flex" alignItems="center" gap={1}>
                          {paymentMethodIcons.receivable}
                          売掛
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="備考"
                    multiline
                    rows={2}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>キャンセル</Button>
          <Button 
            variant="contained" 
            onClick={handleProcessPayment}
            disabled={paymentAmount <= 0}
          >
            決済実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* お渡し予定ダイアログ */}
      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>お渡し予定設定</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="お渡し予定日時"
                type="datetime-local"
                value={scheduledDate ? scheduledDate.slice(0, 16) : ''}
                onChange={(e) => setScheduledDate(e.target.value ? `${e.target.value}:00Z` : '')}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>お渡し方法</InputLabel>
                <Select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as any)}
                  label="お渡し方法"
                >
                  <MenuItem value="store_pickup">店舗受取</MenuItem>
                  <MenuItem value="home_delivery">配送</MenuItem>
                  <MenuItem value="mail">郵送</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={customerNotified}
                    onChange={(e) => setCustomerNotified(e.target.checked)}
                  />
                }
                label="顧客に連絡済み"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleUpdateSchedule}>
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* フィルタダイアログ */}
      <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>お渡し・決済フィルタ</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>お渡しステータス</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({...filters, status: e.target.value as DeliveryStatus || undefined})}
                  label="お渡しステータス"
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="ready">お渡し準備完了</MenuItem>
                  <MenuItem value="scheduled">お渡し予定</MenuItem>
                  <MenuItem value="delivered">お渡し完了</MenuItem>
                  <MenuItem value="partial_delivery">一部お渡し</MenuItem>
                  <MenuItem value="cancelled">お渡しキャンセル</MenuItem>
                  <MenuItem value="returned">返品</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>決済状況</InputLabel>
                <Select
                  value={filters.paymentStatus || ''}
                  onChange={(e) => setFilters({...filters, paymentStatus: e.target.value as any || undefined})}
                  label="決済状況"
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="unpaid">未払い</MenuItem>
                  <MenuItem value="partial">一部入金</MenuItem>
                  <MenuItem value="paid">支払い完了</MenuItem>
                  <MenuItem value="refunded">返金済み</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFilters({});
            setFilterDialog(false);
          }}>
            クリア
          </Button>
          <Button onClick={() => setFilterDialog(false)}>キャンセル</Button>
          <Button variant="contained" onClick={() => setFilterDialog(false)}>
            適用
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// お渡し進捗ステップを計算する関数
const getDeliveryStep = (order: DeliveryOrder): number => {
  if (!order.qualityCheckPassed) return 0;
  if (!order.customerNotified) return 1;
  if (order.status === 'delivered') return 4;
  if (order.paymentStatus === 'paid') return 3;
  return 2;
};