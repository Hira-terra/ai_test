// Page ID: S-005 在庫管理ページ
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import MockBanner from '@/components/MockBanner';
import { Frame, StockItem, Product, FrameStatus } from '@/types';
import { mockInventoryService } from '@/services/mock/inventory.service';
import { MOCK_FRAME_STATUSES, MOCK_PRODUCT_CATEGORIES } from '@/services/mock/data/inventory.mock';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const InventoryPage: React.FC = () => {
  // タブ状態
  const [tabValue, setTabValue] = useState(0);

  // フレーム管理状態
  const [frames, setFrames] = useState<Frame[]>([]);
  const [frameSearch, setFrameSearch] = useState('');
  const [frameStatusFilter, setFrameStatusFilter] = useState<FrameStatus | ''>('');
  
  // 在庫管理状態
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // サマリー状態
  const [summary, setSummary] = useState({
    totalFrames: 0,
    availableFrames: 0,
    reservedFrames: 0,
    soldFrames: 0,
    lowStockItems: 0,
    totalProducts: 0
  });

  // UI状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: 'frame' | 'stock';
    item: Frame | StockItem | null;
  }>({
    open: false,
    type: 'frame',
    item: null
  });

  // 初期化
  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // @MOCK_TO_API: 在庫データ取得
      const [framesResponse, stockResponse, summaryResponse] = await Promise.all([
        mockInventoryService.getFrames(),
        mockInventoryService.getStockItems(),
        mockInventoryService.getInventorySummary()
      ]);

      if (framesResponse.success && framesResponse.data) {
        setFrames(framesResponse.data);
      }
      if (stockResponse.success && stockResponse.data) {
        setStockItems(stockResponse.data);
      }
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      }
    } catch (err: any) {
      setError(err.message || 'データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // フレーム検索
  const searchFrames = async () => {
    setLoading(true);
    try {
      // @MOCK_TO_API: フレーム検索
      const response = await mockInventoryService.getFrames({
        serialNumber: frameSearch,
        status: frameStatusFilter || undefined
      });
      
      if (response.success && response.data) {
        setFrames(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'フレーム検索に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 在庫検索
  const searchStock = async () => {
    setLoading(true);
    try {
      // @MOCK_TO_API: 在庫検索
      const response = await mockInventoryService.getStockItems({
        category: stockCategoryFilter || undefined,
        lowStock: showLowStockOnly
      });
      
      if (response.success && response.data) {
        let filteredStock = response.data;
        
        // @MOCK_LOGIC: 商品名での絞り込み
        if (stockSearch) {
          filteredStock = filteredStock.filter(stock =>
            stock.product?.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
            stock.product?.productCode.toLowerCase().includes(stockSearch.toLowerCase())
          );
        }
        
        setStockItems(filteredStock);
      }
    } catch (err: any) {
      setError(err.message || '在庫検索に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // フレームステータス更新
  const updateFrameStatus = async (serialNumber: string, status: FrameStatus) => {
    try {
      // @MOCK_TO_API: フレームステータス更新
      const response = await mockInventoryService.updateFrameStatus(serialNumber, status);
      
      if (response.success) {
        await loadInventoryData(); // データ再読み込み
        setEditDialog({ open: false, type: 'frame', item: null });
      } else {
        throw new Error(response.error?.message || 'ステータス更新に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 在庫数量更新
  const updateStockQuantity = async (stockItemId: string, quantity: number) => {
    try {
      // @MOCK_TO_API: 在庫数量更新
      const response = await mockInventoryService.updateStockQuantity(stockItemId, quantity);
      
      if (response.success) {
        await loadInventoryData(); // データ再読み込み
        setEditDialog({ open: false, type: 'stock', item: null });
      } else {
        throw new Error(response.error?.message || '在庫数量更新に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ステータスカラー取得
  const getStatusColor = (status: FrameStatus) => {
    const statusConfig = MOCK_FRAME_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'default';
  };

  return (
    <Box>
      {/* @MOCK_UI: モック使用バナー */}
      <MockBanner message="在庫管理機能 - モックデータを使用中" />

      <Typography variant="h5" gutterBottom fontWeight="bold">
        在庫管理
      </Typography>

      {/* サマリーカード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    総フレーム数
                  </Typography>
                  <Typography variant="h4">
                    {summary.totalFrames}
                  </Typography>
                </Box>
                <InventoryIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    販売可能
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {summary.availableFrames}
                  </Typography>
                </Box>
                <AssignmentIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    取り置き
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {summary.reservedFrames}
                  </Typography>
                </Box>
                <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    発注推奨
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {summary.lowStockItems}
                  </Typography>
                </Box>
                <Badge badgeContent={summary.lowStockItems} color="error">
                  <WarningIcon color="error" sx={{ fontSize: 40 }} />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* タブ切り替え */}
      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="フレーム在庫（個品管理）" />
            <Tab label="コンタクト・その他（数量管理）" />
          </Tabs>

          {/* フレーム在庫タブ */}
          <TabPanel value={tabValue} index={0}>
            {/* 検索フィルタ */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="個品番号検索"
                  value={frameSearch}
                  onChange={(e) => setFrameSearch(e.target.value)}
                  placeholder="FR001-001"
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={searchFrames}>
                        <SearchIcon />
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={frameStatusFilter}
                    label="ステータス"
                    onChange={(e) => setFrameStatusFilter(e.target.value as FrameStatus)}
                  >
                    <MenuItem value="">すべて</MenuItem>
                    {MOCK_FRAME_STATUSES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={searchFrames}
                  disabled={loading}
                  sx={{ height: '56px' }}
                >
                  検索
                </Button>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<QrCodeIcon />}
                  sx={{ height: '56px' }}
                >
                  QRコードスキャン
                </Button>
              </Grid>
            </Grid>

            {/* フレーム一覧テーブル */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>個品番号</TableCell>
                    <TableCell>商品名</TableCell>
                    <TableCell>色・サイズ</TableCell>
                    <TableCell>場所</TableCell>
                    <TableCell>仕入日</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {frames.map((frame) => (
                    <TableRow key={frame.id}>
                      <TableCell>
                        <Typography fontWeight="bold">
                          {frame.serialNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{frame.product?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {frame.product?.brand}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{frame.color}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {frame.size}
                        </Typography>
                      </TableCell>
                      <TableCell>{frame.location}</TableCell>
                      <TableCell>
                        {frame.purchaseDate.split('T')[0]}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={MOCK_FRAME_STATUSES.find(s => s.value === frame.status)?.label}
                          color={getStatusColor(frame.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="ステータス変更">
                          <IconButton
                            onClick={() => setEditDialog({
                              open: true,
                              type: 'frame',
                              item: frame
                            })}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* 在庫管理タブ */}
          <TabPanel value={tabValue} index={1}>
            {/* 検索フィルタ */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="商品名検索"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="ワンデーコンタクト"
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={searchStock}>
                        <SearchIcon />
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>カテゴリ</InputLabel>
                  <Select
                    value={stockCategoryFilter}
                    label="カテゴリ"
                    onChange={(e) => setStockCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="">すべて</MenuItem>
                    {MOCK_PRODUCT_CATEGORIES.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant={showLowStockOnly ? "contained" : "outlined"}
                  color={showLowStockOnly ? "error" : "primary"}
                  onClick={() => {
                    setShowLowStockOnly(!showLowStockOnly);
                    searchStock();
                  }}
                  startIcon={<WarningIcon />}
                  sx={{ height: '56px' }}
                >
                  発注推奨のみ
                </Button>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={searchStock}
                  disabled={loading}
                  sx={{ height: '56px' }}
                >
                  検索
                </Button>
              </Grid>
            </Grid>

            {/* 在庫一覧テーブル */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>商品コード</TableCell>
                    <TableCell>商品名</TableCell>
                    <TableCell>ブランド</TableCell>
                    <TableCell align="center">現在庫</TableCell>
                    <TableCell align="center">発注点</TableCell>
                    <TableCell align="center">最大在庫</TableCell>
                    <TableCell>最終更新</TableCell>
                    <TableCell align="center">状態</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockItems.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell>
                        <Typography fontWeight="bold">
                          {stock.product?.productCode}
                        </Typography>
                      </TableCell>
                      <TableCell>{stock.product?.name}</TableCell>
                      <TableCell>{stock.product?.brand}</TableCell>
                      <TableCell align="center">
                        <Typography
                          color={stock.currentStock <= stock.minStock ? 'error' : 'text.primary'}
                          fontWeight={stock.currentStock <= stock.minStock ? 'bold' : 'normal'}
                        >
                          {stock.currentStock}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{stock.minStock}</TableCell>
                      <TableCell align="center">{stock.maxStock}</TableCell>
                      <TableCell>
                        {stock.lastUpdated.split('T')[0]}
                      </TableCell>
                      <TableCell align="center">
                        {stock.currentStock <= stock.minStock ? (
                          <Chip
                            label="発注推奨"
                            color="error"
                            size="small"
                            icon={<WarningIcon />}
                          />
                        ) : (
                          <Chip
                            label="正常"
                            color="success"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="在庫数量変更">
                          <IconButton
                            onClick={() => setEditDialog({
                              open: true,
                              type: 'stock',
                              item: stock
                            })}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      <EditDialog
        open={editDialog.open}
        type={editDialog.type}
        item={editDialog.item}
        onClose={() => setEditDialog({ open: false, type: 'frame', item: null })}
        onUpdateFrame={updateFrameStatus}
        onUpdateStock={updateStockQuantity}
      />
    </Box>
  );
};

// 編集ダイアログコンポーネント
interface EditDialogProps {
  open: boolean;
  type: 'frame' | 'stock';
  item: Frame | StockItem | null;
  onClose: () => void;
  onUpdateFrame: (serialNumber: string, status: FrameStatus) => void;
  onUpdateStock: (stockItemId: string, quantity: number) => void;
}

const EditDialog: React.FC<EditDialogProps> = ({ 
  open, 
  type, 
  item, 
  onClose, 
  onUpdateFrame, 
  onUpdateStock 
}) => {
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('in_stock');
  const [stockQuantity, setStockQuantity] = useState(0);

  useEffect(() => {
    if (item) {
      if (type === 'frame') {
        setFrameStatus((item as Frame).status);
      } else {
        setStockQuantity((item as StockItem).currentStock);
      }
    }
  }, [item, type]);

  const handleSubmit = () => {
    if (!item) return;
    
    if (type === 'frame') {
      onUpdateFrame((item as Frame).serialNumber, frameStatus);
    } else {
      onUpdateStock(item.id, stockQuantity);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {type === 'frame' ? 'フレームステータス変更' : '在庫数量変更'}
      </DialogTitle>
      <DialogContent>
        {item && (
          <Box sx={{ pt: 2 }}>
            {type === 'frame' ? (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  {(item as Frame).product?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  個品番号: {(item as Frame).serialNumber}
                </Typography>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={frameStatus}
                    label="ステータス"
                    onChange={(e) => setFrameStatus(e.target.value as FrameStatus)}
                  >
                    {MOCK_FRAME_STATUSES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  {(item as StockItem).product?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  商品コード: {(item as StockItem).product?.productCode}
                </Typography>
                <TextField
                  fullWidth
                  label="在庫数量"
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 0 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  発注点: {(item as StockItem).minStock} / 
                  最大在庫: {(item as StockItem).maxStock}
                </Typography>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={handleSubmit}>
          更新
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryPage;