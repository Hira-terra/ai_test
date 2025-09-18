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
  LinearProgress,
  Stack,
  Tooltip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Badge,
} from '@mui/material';
import {
  Build as BuildIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import type { 
  ProductionOrder, 
  ProductionStatus, 
  ProductionStep, 
  ProductionStepHistory,
  ProductionSearchParams 
} from '../types';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const productionStatusMap: Record<ProductionStatus, { label: string; color: ChipColor }> = {
  waiting: { label: '製作待ち', color: 'default' },
  lens_processing: { label: 'レンズ加工中', color: 'primary' },
  frame_assembly: { label: 'フレーム組立中', color: 'info' },
  quality_check: { label: '品質検査中', color: 'warning' },
  packaging: { label: '包装中', color: 'secondary' },
  completed: { label: '製作完了', color: 'success' },
  on_hold: { label: '製作保留', color: 'error' },
  rework_required: { label: '再作業要', color: 'error' }
};

const productionSteps: ProductionStep[] = [
  'lens_cutting',
  'lens_grinding', 
  'lens_coating',
  'frame_adjustment',
  'assembly',
  'final_check',
  'cleaning',
  'packaging'
];

const stepLabels: Record<ProductionStep, string> = {
  lens_cutting: 'レンズカット',
  lens_grinding: 'レンズ研磨',
  lens_coating: 'コーティング',
  frame_adjustment: 'フレーム調整',
  assembly: '組み立て',
  final_check: '最終検査',
  cleaning: 'クリーニング',
  packaging: '梱包'
};

export const ProductionManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [stepHistory, setStepHistory] = useState<ProductionStepHistory[]>([]);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [filterDialog, setFilterDialog] = useState(false);
  const [filters, setFilters] = useState<ProductionSearchParams>({});

  useEffect(() => {
    if (user) {
      loadProductionOrders();
    }
  }, [user, filters]);

  const loadProductionOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: 実API実装待ち
      // 現在はデータが空の状態
      const productionOrders: ProductionOrder[] = [];
      
      // フィルタリング処理
      let filteredData = productionOrders;
      if (filters.status) {
        filteredData = filteredData.filter(order => order.status === filters.status);
      }
      if (filters.priority) {
        filteredData = filteredData.filter(order => order.priority === filters.priority);
      }

      setProductionOrders(filteredData);
    } catch (err) {
      setError('製作進捗データの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (order: ProductionOrder) => {
    setSelectedOrder(order);
    
    // モック工程履歴データ
    const mockHistory: ProductionStepHistory[] = [
      {
        id: '1',
        productionOrderId: order.id,
        step: 'lens_cutting',
        status: 'completed',
        startedAt: '2025-09-09T09:00:00Z',
        completedAt: '2025-09-09T10:30:00Z',
        technicianId: 'tech-1',
        technicianName: '田中 技師',
        notes: '正常に完了',
        qualityScore: 5
      },
      {
        id: '2',
        productionOrderId: order.id,
        step: 'lens_grinding',
        status: 'started',
        startedAt: '2025-09-09T10:30:00Z',
        technicianId: 'tech-1',
        technicianName: '田中 技師',
        notes: '研磨作業中'
      }
    ];
    
    setStepHistory(mockHistory);
    setDetailDialog(true);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: ProductionStatus) => {
    try {
      // API実装後に置き換え
      console.log('ステータス更新:', orderId, newStatus);
      
      setProductionOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      alert('ステータスが更新されました');
    } catch (err) {
      setError('ステータス更新に失敗しました');
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedOrder || !selectedTechnician) return;

    try {
      // API実装後に置き換え
      console.log('担当者割り当て:', selectedOrder.id, selectedTechnician);
      
      setProductionOrders(prev => 
        prev.map(order => 
          order.id === selectedOrder.id 
            ? { 
                ...order, 
                assignedTechnician: selectedTechnician,
                assignedTechnicianName: selectedTechnician === 'tech-1' ? '田中 技師' : '佐藤 職人',
                updatedAt: new Date().toISOString() 
              }
            : order
        )
      );
      
      setAssignDialog(false);
      setSelectedTechnician('');
      alert('担当者が割り当てられました');
    } catch (err) {
      setError('担当者の割り当てに失敗しました');
    }
  };

  const getProgressPercentage = (order: ProductionOrder) => {
    const currentStepIndex = productionSteps.indexOf(order.currentStep);
    return Math.round(((currentStepIndex + 1) / productionSteps.length) * 100);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon />
          製作進捗管理
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
            onClick={loadProductionOrders}
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
                製作中
              </Typography>
              <Typography variant="h4">
                {productionOrders.filter(o => ['lens_processing', 'frame_assembly'].includes(o.status)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                品質検査中
              </Typography>
              <Typography variant="h4">
                {productionOrders.filter(o => o.status === 'quality_check').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                完了
              </Typography>
              <Typography variant="h4">
                {productionOrders.filter(o => o.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                遅延リスク
              </Typography>
              <Typography variant="h4" color="error">
                {productionOrders.filter(o => 
                  new Date(o.expectedCompletionDate) < new Date() && o.status !== 'completed'
                ).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 製作オーダー一覧 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>製作番号</TableCell>
              <TableCell>顧客名</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>現在工程</TableCell>
              <TableCell>進捗</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell>優先度</TableCell>
              <TableCell>完成予定</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productionOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {order.productionNumber}
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
                    label={productionStatusMap[order.status].label}
                    color={productionStatusMap[order.status].color}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {stepLabels[order.currentStep]}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ width: 100 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={getProgressPercentage(order)} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {getProgressPercentage(order)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {order.assignedTechnicianName || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={order.priority === 'high' ? '高' : order.priority === 'normal' ? '中' : '低'}
                    color={order.priority === 'high' ? 'error' : order.priority === 'normal' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2"
                    color={new Date(order.expectedCompletionDate) < new Date() ? 'error' : 'inherit'}
                  >
                    {formatDate(order.expectedCompletionDate)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<TimelineIcon />}
                      onClick={() => handleOpenDetail(order)}
                    >
                      詳細
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PersonIcon />}
                      onClick={() => {
                        setSelectedOrder(order);
                        setAssignDialog(true);
                      }}
                    >
                      担当
                    </Button>
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
          製作進捗詳細 - {selectedOrder?.productionNumber}
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
                      <Typography variant="body2" color="textSecondary">製作番号</Typography>
                      <Typography variant="body1">{selectedOrder.productionNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">現在ステータス</Typography>
                      <Chip
                        label={productionStatusMap[selectedOrder.status].label}
                        color={productionStatusMap[selectedOrder.status].color}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">担当者</Typography>
                      <Typography variant="body1">{selectedOrder.assignedTechnicianName || '未割当'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Typography variant="h6" gutterBottom>工程進捗</Typography>
              <Stepper orientation="vertical">
                {productionSteps.map((step) => {
                  const historyItem = stepHistory.find(h => h.step === step);
                  const isActive = selectedOrder.currentStep === step;
                  const isCompleted = historyItem?.status === 'completed';
                  
                  return (
                    <Step key={step} active={isActive} completed={isCompleted}>
                      <StepLabel>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {stepLabels[step]}
                          </Typography>
                          {historyItem && (
                            <Chip
                              size="small"
                              label={historyItem.status === 'completed' ? '完了' : '作業中'}
                              color={historyItem.status === 'completed' ? 'success' : 'primary'}
                            />
                          )}
                        </Box>
                      </StepLabel>
                      <StepContent>
                        {historyItem && (
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              担当: {historyItem.technicianName}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              開始: {formatDate(historyItem.startedAt)}
                            </Typography>
                            {historyItem.completedAt && (
                              <Typography variant="body2" color="textSecondary">
                                完了: {formatDate(historyItem.completedAt)}
                              </Typography>
                            )}
                            {historyItem.notes && (
                              <Typography variant="body2">
                                備考: {historyItem.notes}
                              </Typography>
                            )}
                            {historyItem.qualityScore && (
                              <Typography variant="body2">
                                品質評価: {historyItem.qualityScore}/5点
                              </Typography>
                            )}
                          </Box>
                        )}
                      </StepContent>
                    </Step>
                  );
                })}
              </Stepper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 担当者割り当てダイアログ */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>担当者割り当て</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>担当技師</InputLabel>
            <Select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              label="担当技師"
            >
              <MenuItem value="tech-1">田中 技師</MenuItem>
              <MenuItem value="tech-2">佐藤 職人</MenuItem>
              <MenuItem value="tech-3">鈴木 マスター</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>キャンセル</Button>
          <Button 
            variant="contained" 
            onClick={handleAssignTechnician}
            disabled={!selectedTechnician}
          >
            割り当て
          </Button>
        </DialogActions>
      </Dialog>

      {/* フィルタダイアログ */}
      <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>製作進捗フィルタ</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({...filters, status: e.target.value as ProductionStatus || undefined})}
                  label="ステータス"
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="waiting">製作待ち</MenuItem>
                  <MenuItem value="lens_processing">レンズ加工中</MenuItem>
                  <MenuItem value="frame_assembly">フレーム組立中</MenuItem>
                  <MenuItem value="quality_check">品質検査中</MenuItem>
                  <MenuItem value="packaging">包装中</MenuItem>
                  <MenuItem value="completed">製作完了</MenuItem>
                  <MenuItem value="on_hold">製作保留</MenuItem>
                  <MenuItem value="rework_required">再作業要</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters({...filters, priority: e.target.value as any || undefined})}
                  label="優先度"
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="low">低</MenuItem>
                  <MenuItem value="normal">中</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                  <MenuItem value="urgent">緊急</MenuItem>
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