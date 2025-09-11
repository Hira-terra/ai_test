import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Grid,
  Skeleton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { StockLevel, StockLevelAlert, Supplier, CreateStockPurchaseOrderItem, PurchaseOrder } from '../types';
import { purchaseOrderService } from '../services/purchaseOrder.service';
import { productService } from '../services/product.service';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stock-tabpanel-${index}`}
      aria-labelledby={`stock-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StockReplenishmentPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockLevelAlert[]>([]);
  const [suggestedOrders, setSuggestedOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 在庫発注作成ダイアログの状態
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [selectedStockItems, setSelectedStockItems] = useState<CreateStockPurchaseOrderItem[]>([]);

  const { user } = useAuth();
  const storeId = user?.store?.id || '';

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    if (!storeId) {
      setError('店舗情報が取得できません');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 並列でデータを取得
      const [stockLevelsResult, alertsResult, suggestionsResult, suppliersResult, productsResult] = await Promise.all([
        purchaseOrderService.getStockLevels({ storeId, limit: 100 }),
        purchaseOrderService.getStockAlerts({ storeId, isResolved: false }),
        purchaseOrderService.getSuggestedOrders(storeId),
        purchaseOrderService.getSuppliers(),
        productService.getProducts()
      ]);

      if (stockLevelsResult.success && stockLevelsResult.data) {
        setStockLevels(stockLevelsResult.data.stockLevels);
      }

      if (alertsResult.success && alertsResult.data) {
        setStockAlerts(alertsResult.data.alerts);
      }

      if (suggestionsResult.success && suggestionsResult.data) {
        setSuggestedOrders(suggestionsResult.data);
      }

      if (suppliersResult.success && suppliersResult.data) {
        setSuppliers(suppliersResult.data);
      }

      if (productsResult.success && productsResult.data) {
        setProducts(productsResult.data);
      }

    } catch (error) {
      console.error('データ取得エラー:', error);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 手動発注作成（空の状態から開始）
  const handleCreateManualOrder = () => {
    setSelectedStockItems([]);
    setCreateOrderDialogOpen(true);
  };

  // 推奨発注作成（推奨データを事前設定、但し編集可能）
  const handleCreateSuggestedOrder = () => {
    // 提案から自動選択
    const autoSelectedItems: CreateStockPurchaseOrderItem[] = suggestedOrders.map(suggestion => ({
      productId: suggestion.productId,
      quantity: suggestion.suggestedQuantity,
      targetStockLevel: suggestion.maxStock,
      currentStockLevel: suggestion.currentQuantity,
      notes: `推奨発注: 在庫不足のため補充`
    }));

    setSelectedStockItems(autoSelectedItems);
    setCreateOrderDialogOpen(true);
  };

  // 発注商品の数量変更
  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const updatedItems = [...selectedStockItems];
    updatedItems[index].quantity = newQuantity;
    setSelectedStockItems(updatedItems);
  };

  // 発注商品の削除
  const handleRemoveItem = (index: number) => {
    const updatedItems = selectedStockItems.filter((_, i) => i !== index);
    setSelectedStockItems(updatedItems);
  };

  // 新しい商品の追加
  const handleAddNewItem = () => {
    const newItem: CreateStockPurchaseOrderItem = {
      productId: '',
      quantity: 1,
      targetStockLevel: 0,
      currentStockLevel: 0,
      notes: '手動追加'
    };
    setSelectedStockItems([...selectedStockItems, newItem]);
  };

  // 商品選択の変更
  const handleProductChange = (index: number, productId: string) => {
    const updatedItems = [...selectedStockItems];
    updatedItems[index].productId = productId;
    
    // 選択された商品の在庫情報を設定
    const stockLevel = stockLevels.find(sl => sl.productId === productId);
    if (stockLevel) {
      updatedItems[index].currentStockLevel = stockLevel.currentQuantity;
      updatedItems[index].targetStockLevel = stockLevel.maxStock;
    }
    
    setSelectedStockItems(updatedItems);
  };

  const handleSubmitStockOrder = async () => {
    if (!selectedSupplier || selectedStockItems.length === 0) {
      setError('仕入先と商品を選択してください');
      return;
    }

    try {
      const result = await purchaseOrderService.createStockReplenishment({
        supplierId: selectedSupplier,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: orderNotes || undefined,
        stockItems: selectedStockItems
      });

      if (result.success) {
        setCreateOrderDialogOpen(false);
        setSelectedSupplier('');
        setExpectedDeliveryDate('');
        setOrderNotes('');
        setSelectedStockItems([]);
        
        // データを再読み込み
        await loadData();
        
        alert(`在庫発注を作成しました: ${result.data?.purchaseOrderNumber || ''}`);
      } else {
        setError('在庫発注の作成に失敗しました');
      }
    } catch (error) {
      console.error('在庫発注作成エラー:', error);
      setError('在庫発注の作成に失敗しました');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  const getAlertChipColor = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock': return 'error';
      case 'low_stock': return 'warning';
      case 'overstocked': return 'info';
      default: return 'default';
    }
  };

  const getAlertLabel = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock': return '在庫切れ';
      case 'low_stock': return '低在庫';
      case 'overstocked': return '過剰在庫';
      default: return alertType;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Skeleton variant="text" width="300px" height={40} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={200} />
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* ヘッダー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            <InventoryIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            在庫発注管理
          </Typography>
          <Box>
            <Tooltip title="データを更新">
              <IconButton onClick={loadData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<ShoppingCartIcon />}
              onClick={handleCreateManualOrder}
              sx={{ ml: 1 }}
            >
              手動発注作成
            </Button>
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleCreateSuggestedOrder}
              disabled={suggestedOrders.length === 0}
              sx={{ ml: 1 }}
            >
              推奨発注作成
            </Button>
          </Box>
        </Box>

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* サマリーカード */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  管理商品数
                </Typography>
                <Typography variant="h5">
                  {stockLevels.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  アクティブアラート
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {stockAlerts.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  発注提案
                </Typography>
                <Typography variant="h5" color="info.main">
                  {suggestedOrders.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  提案金額
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(suggestedOrders.reduce((sum, s) => sum + (s.suggestedCost || 0), 0))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* タブナビゲーション */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="在庫アラート" icon={<WarningIcon />} />
            <Tab label="自動発注提案" icon={<AutoAwesomeIcon />} />
            <Tab label="在庫レベル一覧" icon={<InventoryIcon />} />
          </Tabs>

          {/* タブコンテンツ */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              在庫アラート ({stockAlerts.length}件)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>商品コード</TableCell>
                    <TableCell>商品名</TableCell>
                    <TableCell>アラート種別</TableCell>
                    <TableCell align="right">現在在庫</TableCell>
                    <TableCell align="right">安全在庫</TableCell>
                    <TableCell>作成日時</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{alert.stockLevel?.product?.productCode || 'N/A'}</TableCell>
                      <TableCell>{alert.stockLevel?.product?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getAlertLabel(alert.alertType)} 
                          color={getAlertChipColor(alert.alertType)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{alert.currentQuantity}</TableCell>
                      <TableCell align="right">{alert.thresholdQuantity}</TableCell>
                      <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {stockAlerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="textSecondary">
                          アクティブなアラートはありません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              自動発注提案 ({suggestedOrders.length}件)
            </Typography>
            {suggestedOrders.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                以下の商品は安全在庫を下回っています。発注を検討してください。
              </Alert>
            )}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>商品コード</TableCell>
                    <TableCell>商品名</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell align="right">現在在庫</TableCell>
                    <TableCell align="right">安全在庫</TableCell>
                    <TableCell align="right">推奨発注数</TableCell>
                    <TableCell align="right">発注金額</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suggestedOrders.map((suggestion) => (
                    <TableRow key={suggestion.productId}>
                      <TableCell>{suggestion.product?.productCode}</TableCell>
                      <TableCell>{suggestion.product?.name}</TableCell>
                      <TableCell>
                        <Chip label={suggestion.product?.category} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={suggestion.currentQuantity <= suggestion.safetyStock ? 'error' : 'inherit'}>
                          {suggestion.currentQuantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{suggestion.safetyStock}</TableCell>
                      <TableCell align="right">
                        <Typography color="primary" fontWeight="bold">
                          {suggestion.suggestedQuantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="success.main" fontWeight="bold">
                          {formatCurrency(suggestion.suggestedCost || 0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {suggestedOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary">
                          発注提案はありません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              在庫レベル一覧 ({stockLevels.length}件)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>商品コード</TableCell>
                    <TableCell>商品名</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell align="right">現在在庫</TableCell>
                    <TableCell align="right">安全在庫</TableCell>
                    <TableCell align="right">最大在庫</TableCell>
                    <TableCell>自動発注</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockLevels.map((stockLevel) => (
                    <TableRow key={stockLevel.id}>
                      <TableCell>{stockLevel.product?.productCode}</TableCell>
                      <TableCell>{stockLevel.product?.name}</TableCell>
                      <TableCell>
                        <Chip label={stockLevel.product?.category} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          color={stockLevel.currentQuantity <= stockLevel.safetyStock ? 'error' : 'inherit'}
                          fontWeight={stockLevel.currentQuantity <= stockLevel.safetyStock ? 'bold' : 'normal'}
                        >
                          {stockLevel.currentQuantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{stockLevel.safetyStock}</TableCell>
                      <TableCell align="right">{stockLevel.maxStock}</TableCell>
                      <TableCell>
                        <Chip 
                          label={stockLevel.autoOrderEnabled ? '有効' : '無効'} 
                          color={stockLevel.autoOrderEnabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Paper>

        {/* 在庫発注作成ダイアログ */}
        <Dialog 
          open={createOrderDialogOpen} 
          onClose={() => setCreateOrderDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <ShoppingCartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            在庫発注作成
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>仕入先</InputLabel>
                    <Select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      required
                    >
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.supplierCode})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="納期予定日"
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="備考"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
                <Typography variant="h6">
                  発注商品 ({selectedStockItems.length}件)
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddNewItem}
                  size="small"
                  variant="outlined"
                >
                  商品追加
                </Button>
              </Box>
              
              {selectedStockItems.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>商品</TableCell>
                        <TableCell align="right">現在在庫</TableCell>
                        <TableCell align="right">発注数</TableCell>
                        <TableCell align="right">単価</TableCell>
                        <TableCell align="right">金額</TableCell>
                        <TableCell align="center">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedStockItems.map((item, index) => {
                        const suggestion = suggestedOrders.find(s => s.productId === item.productId);
                        const product = products.find(p => p.id === item.productId);
                        const displayProduct = suggestion?.product || product;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={item.productId}
                                  onChange={(e) => handleProductChange(index, e.target.value)}
                                  displayEmpty
                                >
                                  <MenuItem value="">
                                    <em>商品を選択</em>
                                  </MenuItem>
                                  {products.map((prod) => (
                                    <MenuItem key={prod.id} value={prod.id}>
                                      {prod.name} ({prod.productCode})
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell align="right">{item.currentStockLevel}</TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                size="small"
                                inputProps={{ min: 0, style: { textAlign: 'right' } }}
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(displayProduct?.costPrice || 0)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency((displayProduct?.costPrice || 0) * item.quantity)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                onClick={() => handleRemoveItem(index)}
                                size="small"
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={5} align="right">
                          <Typography fontWeight="bold">合計:</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold" color="primary">
                            {formatCurrency(
                              selectedStockItems.reduce((sum, item) => {
                                const suggestion = suggestedOrders.find(s => s.productId === item.productId);
                                const product = products.find(p => p.id === item.productId);
                                const displayProduct = suggestion?.product || product;
                                return sum + ((displayProduct?.costPrice || 0) * item.quantity);
                              }, 0)
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="textSecondary">発注商品がありません</Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOrderDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSubmitStockOrder}
              variant="contained"
              disabled={!selectedSupplier || selectedStockItems.length === 0}
            >
              発注作成
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default StockReplenishmentPage;