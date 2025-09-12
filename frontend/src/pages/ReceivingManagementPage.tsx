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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Stack,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as LocalShippingIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { receivingAPIService } from '../services/api/receiving.service';
import { supplierAPIService } from '../services/api/supplier.service';
import { useAuth } from '../contexts/AuthContext';
import type { PurchaseOrder, PurchaseOrderStatus, Supplier, QualityStatus, PurchaseOrderItem } from '../types';
import { IndividualItemAssignmentDialog } from '../components/IndividualItemAssignmentDialog';
import { frameService } from '../services/frame.service';
import QRCodePrintDialog from '../components/QRCodePrintDialog';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const statusMap: Record<PurchaseOrderStatus, { label: string; color: ChipColor }> = {
  draft: { label: '下書き', color: 'default' },
  sent: { label: '発注済み', color: 'primary' },
  confirmed: { label: '確認済み', color: 'info' },
  partially_delivered: { label: '一部納品', color: 'warning' },
  delivered: { label: '納品完了', color: 'success' },
  cancelled: { label: 'キャンセル', color: 'error' }
};

const qualityStatusMap: Record<QualityStatus, { label: string; color: ChipColor }> = {
  good: { label: '良品', color: 'success' },
  damaged: { label: '破損', color: 'error' },
  defective: { label: '不良品', color: 'error' },
  incorrect_spec: { label: '仕様違い', color: 'warning' },
  passed: { label: '合格', color: 'success' },
  failed: { label: '不合格', color: 'error' },
  pending: { label: '検査待ち', color: 'warning' },
  partial: { label: '一部不良', color: 'warning' }
};

export const ReceivingManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [receivingDialog, setReceivingDialog] = useState(false);
  const [receivingItems, setReceivingItems] = useState<Map<string, {
    receivedQuantity: number;
    qualityStatus: QualityStatus;
    notes: string;
  }>>(new Map());
  const [individualAssignmentDialog, setIndividualAssignmentDialog] = useState(false);
  const [selectedIndividualItem, setSelectedIndividualItem] = useState<PurchaseOrderItem | null>(null);
  const [assignedIndividuals, setAssignedIndividuals] = useState<any[]>([]);
  const [showAssignedResults, setShowAssignedResults] = useState(false);
  const [qrPrintDialog, setQrPrintDialog] = useState(false);
  const [framesForPrint, setFramesForPrint] = useState<any[]>([]);
  const [savingIndividuals, setSavingIndividuals] = useState(false); // 個体番号保存中フラグ
  const [assignedItemIds, setAssignedItemIds] = useState<Set<string>>(new Set()); // 既に個体番号が割り当てられた発注項目ID

  useEffect(() => {
    loadSuppliers();
    if (user) {
      loadPendingOrders();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPendingOrders();
    }
  }, [selectedSupplier, user]);

  const loadSuppliers = async () => {
    try {
      const response = await supplierAPIService.getAllSuppliers();
      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (err) {
      console.error('仕入先の取得に失敗しました:', err);
    }
  };

  const loadPendingOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (user?.store?.id) {
        params.storeId = user.store.id;
      }
      if (selectedSupplier) {
        params.supplierId = selectedSupplier;
      }
      const response = await receivingAPIService.getPendingOrders(Object.keys(params).length > 0 ? params : undefined);
      if (response.success && response.data) {
        setPendingOrders(response.data);
      }
    } catch (err) {
      setError('入庫待ち発注の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceivingDialog = async (order: PurchaseOrder) => {
    try {
      const response = await receivingAPIService.getPurchaseOrderDetail(order.id);
      if (response.success && response.data) {
        setSelectedOrder(response.data);
        
        // 初期値設定
        const itemsMap = new Map();
        response.data.items?.forEach(item => {
          itemsMap.set(item.id, {
            receivedQuantity: 0,
            qualityStatus: 'pending' as QualityStatus,
            notes: ''
          });
        });
        setReceivingItems(itemsMap);
        setReceivingDialog(true);
        
        // 既存の個体番号割り当て状況を確認
        loadExistingIndividualAssignments(response.data);
      }
    } catch (err) {
      setError('発注詳細の取得に失敗しました');
      console.error(err);
    }
  };

  // 発注項目の既存個体番号割り当て状況をチェック
  const loadExistingIndividualAssignments = async (_order: PurchaseOrder) => {
    try {
      // 注意：現在のデータ構造では発注項目と個体番号の正確な関連付けができないため、
      // 誤った判定を避けるために既存個体番号チェック機能を一時的に無効化
      // 実際の運用では、個体番号テーブルに purchase_order_item_id を追加するか、
      // 別途関連付けテーブルを作成することを推奨
      
      // 空のSetを設定することで、全ての発注項目を「未割り当て」として表示
      setAssignedItemIds(new Set<string>());
      
      // TODO: 将来的な改善案
      // 1. framesテーブルにpurchase_order_item_idカラムを追加
      // 2. purchase_order_item_framesテーブルを作成して関連付けを管理
      // 3. 発注項目IDをキーとした正確な関連付けチェックを実装
      
    } catch (error) {
      console.error('既存個体番号の確認中にエラーが発生しました:', error);
      setAssignedItemIds(new Set<string>());
    }
  };

  const handleBulkReceiving = () => {
    if (!selectedOrder) return;
    
    const newItemsMap = new Map();
    selectedOrder.items?.forEach(item => {
      newItemsMap.set(item.id, {
        receivedQuantity: item.quantity || 0,
        qualityStatus: 'good' as QualityStatus,
        notes: ''
      });
    });
    setReceivingItems(newItemsMap);
  };

  const handleReceivingItemChange = (
    itemId: string,
    field: 'receivedQuantity' | 'qualityStatus' | 'notes',
    value: any
  ) => {
    setReceivingItems(prev => {
      const newMap = new Map(prev);
      const item = newMap.get(itemId) || {
        receivedQuantity: 0,
        qualityStatus: 'pending' as QualityStatus,
        notes: ''
      };
      newMap.set(itemId, { ...item, [field]: value });
      return newMap;
    });
  };

  const handleSubmitReceiving = async () => {
    if (!selectedOrder) return;

    try {
      const items = Array.from(receivingItems.entries()).map(([itemId, data]) => ({
        purchaseOrderItemId: itemId,
        receivedQuantity: data.receivedQuantity,
        qualityStatus: data.qualityStatus,
        notes: data.notes || undefined
      }));

      const response = await receivingAPIService.createReceiving({
        purchaseOrderId: selectedOrder.id,
        items,
        receivedBy: localStorage.getItem('userId') || '',
        notes: ''
      });

      if (response.success) {
        setReceivingDialog(false);
        setSelectedOrder(null);
        setReceivingItems(new Map());
        loadPendingOrders();
        alert('入庫登録が完了しました');
      }
    } catch (err) {
      setError('入庫登録に失敗しました');
      console.error(err);
    }
  };

  const handleOpenIndividualAssignment = (item: PurchaseOrderItem) => {
    setSelectedIndividualItem(item);
    setIndividualAssignmentDialog(true);
  };

  const handleSaveIndividualItems = async (items: any[]) => {
    // 二重クリック防止：既に処理中の場合は処理を終了
    if (savingIndividuals) {
      console.warn('個体番号保存処理が既に実行中です');
      return;
    }

    setSavingIndividuals(true);
    try {
      if (!selectedIndividualItem || !user?.store?.id) {
        throw new Error('必要な情報が不足しています');
      }

      // 入庫時の個体管理品登録API呼び出し
      const data = {
        purchaseOrderItemId: selectedIndividualItem.id,
        productId: selectedIndividualItem.productId,
        storeId: user.store.id,
        purchaseDate: new Date().toISOString(),
        purchasePrice: selectedIndividualItem.unitCost,
        items: items
      };

      console.log('入庫時個体管理品登録:', data);
      const createdFrames = await frameService.createIndividualItems(data);
      
      // 成功したら入庫数を更新
      handleReceivingItemChange(
        selectedIndividualItem.id,
        'receivedQuantity',
        items.length
      );
      
      // 付番結果を保存して表示
      setAssignedIndividuals(createdFrames || items);
      setShowAssignedResults(true);
      
      // QRコード印刷用にデータを保存
      setFramesForPrint(createdFrames || items);
      
      // 個体番号が正常に生成されたら、この発注項目IDを既割り当て済みとしてマーク
      setAssignedItemIds(prev => new Set(prev.add(selectedIndividualItem.id)));
      
      setIndividualAssignmentDialog(false);
      setSelectedIndividualItem(null);
    } catch (err) {
      console.error('入庫時個体管理品登録エラー:', err);
      throw err;
    } finally {
      setSavingIndividuals(false);
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
    return date.toLocaleDateString('ja-JP');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShippingIcon />
          入庫管理
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>仕入先でフィルタ</InputLabel>
              <Select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                label="仕入先でフィルタ"
              >
                <MenuItem value="">
                  <em>すべて</em>
                </MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>発注番号</TableCell>
              <TableCell>仕入先</TableCell>
              <TableCell>発注日</TableCell>
              <TableCell>納品予定日</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell align="right">発注金額</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.purchaseOrderNumber}</TableCell>
                <TableCell>{order.supplier?.name || '-'}</TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell>{formatDate(order.expectedDeliveryDate)}</TableCell>
                <TableCell>
                  <Chip
                    label={statusMap[order.status]?.label || order.status}
                    color={statusMap[order.status]?.color || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{formatCurrency(order.totalAmount)}</TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AssignmentIcon />}
                    onClick={() => handleOpenReceivingDialog(order)}
                  >
                    入庫処理
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 入庫処理ダイアログ */}
      <Dialog open={receivingDialog} onClose={() => setReceivingDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography component="span">
              入庫処理 - {selectedOrder?.purchaseOrderNumber}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={handleBulkReceiving}
            >
              一括入庫
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <>
              <Card sx={{ mb: 2, mt: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">仕入先</Typography>
                      <Typography variant="body1">{selectedOrder.supplier?.name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">発注日</Typography>
                      <Typography variant="body1">{formatDate(selectedOrder.orderDate)}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Typography variant="h6" sx={{ mb: 2 }}>入庫商品</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>商品コード</TableCell>
                      <TableCell>商品名</TableCell>
                      <TableCell align="center">発注数</TableCell>
                      <TableCell align="center">入庫数</TableCell>
                      <TableCell align="center">品質検査</TableCell>
                      <TableCell>備考</TableCell>
                      <TableCell align="center">個体管理</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item) => {
                      const receivingItem = receivingItems.get(item.id) || {
                        receivedQuantity: item.quantity,
                        qualityStatus: 'pending' as QualityStatus,
                        notes: ''
                      };
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.productCode}</TableCell>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={receivingItem.receivedQuantity}
                              onChange={(e) => handleReceivingItemChange(
                                item.id,
                                'receivedQuantity',
                                parseInt(e.target.value) || 0
                              )}
                              inputProps={{ min: 0, max: item.quantity }}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Select
                              size="small"
                              value={receivingItem.qualityStatus}
                              onChange={(e) => handleReceivingItemChange(
                                item.id,
                                'qualityStatus',
                                e.target.value
                              )}
                              sx={{ width: 120 }}
                            >
                              <MenuItem value="good">良品</MenuItem>
                              <MenuItem value="damaged">破損</MenuItem>
                              <MenuItem value="defective">不良品</MenuItem>
                              <MenuItem value="incorrect_spec">仕様違い</MenuItem>
                              <MenuItem value="passed">合格</MenuItem>
                              <MenuItem value="failed">不合格</MenuItem>
                              <MenuItem value="pending">検査待ち</MenuItem>
                              <MenuItem value="partial">一部不良</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={receivingItem.notes}
                              onChange={(e) => handleReceivingItemChange(
                                item.id,
                                'notes',
                                e.target.value
                              )}
                              placeholder="備考"
                              sx={{ width: 150 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {item.product?.managementType === 'individual' ? (
                              assignedItemIds.has(item.id) ? (
                                // 既に個体番号が割り当てられている場合
                                <Stack direction="column" alignItems="center" spacing={1}>
                                  <Chip 
                                    label="割り当て済み" 
                                    color="success" 
                                    size="small"
                                    icon={<CheckCircleIcon />}
                                  />
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="secondary"
                                    startIcon={<InfoIcon />}
                                    onClick={() => handleOpenIndividualAssignment(item)}
                                    sx={{ minWidth: 100 }}
                                  >
                                    追加割り当て
                                  </Button>
                                </Stack>
                              ) : (
                                // まだ個体番号が割り当てられていない場合
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<QrCodeIcon />}
                                  onClick={() => handleOpenIndividualAssignment(item)}
                                  sx={{ minWidth: 100 }}
                                >
                                  個体管理
                                </Button>
                              )
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceivingDialog(false)}>キャンセル</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircleIcon />}
            onClick={handleSubmitReceiving}
          >
            入庫確定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 個体管理ダイアログ */}
      <IndividualItemAssignmentDialog
        open={individualAssignmentDialog}
        onClose={() => {
          setIndividualAssignmentDialog(false);
          setSavingIndividuals(false); // ダイアログが閉じられた時にもフラグをリセット
        }}
        purchaseOrderItem={selectedIndividualItem}
        onSave={handleSaveIndividualItems}
      />

      {/* 個体番号付番結果表示ダイアログ */}
      <Dialog 
        open={showAssignedResults} 
        onClose={() => setShowAssignedResults(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6">個体番号付番完了</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="success" sx={{ mb: 2 }}>
            {assignedIndividuals.length}個の個体番号が正常に付番されました
          </Alert>
          
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            付番された個体一覧:
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>個体番号</TableCell>
                  <TableCell>色</TableCell>
                  <TableCell>サイズ</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>保管場所</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignedIndividuals.map((individual, index) => (
                  <TableRow key={individual.serialNumber || index}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                        {individual.serialNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{individual.color || '-'}</TableCell>
                    <TableCell>{individual.size || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={individual.status === 'in_stock' ? '在庫中' : individual.status} 
                        color="success" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{individual.location || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            これらの個体は「個体管理」画面で確認・管理できます
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<PrintIcon />}
            onClick={() => {
              setQrPrintDialog(true);
            }}
            variant="outlined"
            sx={{ mr: 'auto' }}
          >
            QRコード印刷
          </Button>
          <Button onClick={() => setShowAssignedResults(false)} variant="contained">
            確認
          </Button>
        </DialogActions>
      </Dialog>

      {/* QRコード印刷ダイアログ */}
      <QRCodePrintDialog
        open={qrPrintDialog}
        onClose={() => setQrPrintDialog(false)}
        frames={framesForPrint}
        storeCode={user?.store?.storeCode || 'ST01'}
      />
    </Box>
  );
};