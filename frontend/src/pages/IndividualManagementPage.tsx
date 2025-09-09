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
  Card,
  CardContent,
  Stack,
  InputAdornment
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { frameService } from '../services/frame.service';

import { Frame, Product, FrameStatus } from '../types';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const statusMap = {
  in_stock: { label: '在庫中', color: 'success' as ChipColor },
  reserved: { label: '予約済み', color: 'warning' as ChipColor },
  sold: { label: '販売済み', color: 'default' as ChipColor },
  damaged: { label: '破損', color: 'error' as ChipColor },
  transferred: { label: '移管済み', color: 'info' as ChipColor }
};

export const IndividualManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // フィルター・検索状態
  const [searchSerial, setSearchSerial] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  
  // ダイアログ状態
  const [editDialog, setEditDialog] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  
  // 統計情報
  const [inventorySummary, setInventorySummary] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.store?.id) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.store?.id) {
      loadFrames();
    }
  }, [searchSerial, filterStatus, filterProduct, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadFrames(),
        loadInventorySummary()
      ]);
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      // 個体管理品（フレーム）のみ取得
      console.log('個体管理商品を読み込み中...');
      
      // 実APIを呼び出し（管理タイプが'individual'の商品のみ）
      try {
        const response = await fetch('/api/products?category=frame&managementType=individual', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          const products = result.data || [];
          setProducts(products);
          console.log('個体管理商品データ取得成功:', products.length, '件');
        } else {
          throw new Error('商品API呼び出し失敗');
        }
      } catch (apiError) {
        console.log('商品API呼び出し失敗、モックデータを使用:', apiError);
        
        // フォールバック用モックデータ
        const mockProducts: Product[] = [
          { id: 'cccccccc-cccc-cccc-cccc-cccccccccc01', productCode: 'FRAME001', name: 'クラシックフレーム A型', brand: 'BrandA', category: 'frame', managementType: 'individual', retailPrice: 29800, costPrice: 15000, isActive: true, createdAt: '', updatedAt: '' },
          { id: 'cccccccc-cccc-cccc-cccc-cccccccccc02', productCode: 'FRAME002', name: 'モダンフレーム B型', brand: 'BrandB', category: 'frame', managementType: 'individual', retailPrice: 34800, costPrice: 18000, isActive: true, createdAt: '', updatedAt: '' },
          { id: 'cccccccc-cccc-cccc-cccc-cccccccccc03', productCode: 'FRAME003', name: 'スポーツフレーム C型', brand: 'BrandC', category: 'frame', managementType: 'individual', retailPrice: 24800, costPrice: 12000, isActive: true, createdAt: '', updatedAt: '' },
        ];
        setProducts(mockProducts);
      }
    } catch (err) {
      console.error('商品取得エラー:', err);
    }
  };

  const loadFrames = async () => {
    try {
      if (!user?.store?.id) return;
      
      console.log('フレーム個体を読み込み中...', { searchSerial, filterStatus, filterProduct });
      
      // 実APIを呼び出し
      const frames = await frameService.getFrames({
        storeId: user.store.id,
        status: filterStatus as FrameStatus,
        productId: filterProduct,
        serialNumber: searchSerial
      });
      
      setFrames(frames);
    } catch (err) {
      console.error('フレーム個体取得エラー:', err);
      setFrames([]);
    }
  };

  const loadInventorySummary = async () => {
    try {
      if (!user?.store?.id) return;
      
      console.log('在庫サマリーを読み込み中...');
      
      // 実APIを呼び出し
      const summary = await frameService.getInventorySummary(user.store.id);
      setInventorySummary(summary);
    } catch (err) {
      console.error('在庫サマリー取得エラー:', err);
      setInventorySummary({
        in_stock: 0,
        reserved: 0,
        sold: 0,
        damaged: 0,
        transferred: 0
      });
    }
  };

  const handleClearFilters = () => {
    setSearchSerial('');
    setFilterStatus('');
    setFilterProduct('');
  };

  const handleEditFrame = (frame: Frame) => {
    setSelectedFrame(frame);
    setEditDialog(true);
  };

  const handleDeleteFrame = async (frame: Frame) => {
    if (!window.confirm(`個体番号「${frame.serialNumber}」を削除しますか？`)) {
      return;
    }

    try {
      // 実APIを呼び出し
      await frameService.deleteFrame(frame.id);
      
      await loadFrames();
      await loadInventorySummary();
      alert('個体が削除されました');
    } catch (err) {
      setError('個体の削除に失敗しました');
      console.error(err);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeIcon />
          個体管理
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadData()}
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

      {/* 在庫サマリー */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(statusMap).map(([status, config]) => (
          <Grid item xs={12} sm={6} md={2.4} key={status}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color={`${config.color}.main`}>
                  {inventorySummary[status] || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {config.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 検索・フィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon />
          検索・フィルター
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="個体番号検索"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>ステータス</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="ステータス"
              >
                <MenuItem value="">すべて</MenuItem>
                {Object.entries(statusMap).map(([status, config]) => (
                  <MenuItem key={status} value={status}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>商品</InputLabel>
              <Select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                label="商品"
              >
                <MenuItem value="">すべて</MenuItem>
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleClearFilters}
            >
              クリア
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 個体一覧テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>個体番号</TableCell>
              <TableCell>商品名</TableCell>
              <TableCell>色・サイズ</TableCell>
              <TableCell>購入日</TableCell>
              <TableCell align="right">購入価格</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>保管場所</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {frames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    入庫済み個体データがありません
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    商品の入庫時に個体番号が自動付番されます。
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    「入庫管理」画面で商品を入庫してください。
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              frames.map((frame) => (
                <TableRow key={frame.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {frame.serialNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // フレームのproductIdに対応する商品情報を探す
                      const product = products.find(p => p.id === frame.productId);
                      if (product) {
                        return (
                          <Typography variant="body2">
                            {product.name}
                          </Typography>
                        );
                      } else {
                        // プロダクトが見つからない場合の表示
                        return (
                          <Typography variant="body2" color="textSecondary">
                            商品情報取得中...
                          </Typography>
                        );
                      }
                    })()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {frame.color} / {frame.size}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(frame.purchaseDate)}</TableCell>
                  <TableCell align="right">{formatCurrency(frame.purchasePrice)}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusMap[frame.status]?.label || frame.status}
                      color={statusMap[frame.status]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{frame.location || '-'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditFrame(frame)}
                        title="編集"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteFrame(frame)}
                        title="削除"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>


      {/* 個体編集ダイアログ（簡易版） */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>個体情報編集</DialogTitle>
        <DialogContent>
          {selectedFrame && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="個体番号"
                  value={selectedFrame.serialNumber}
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="色"
                  defaultValue={selectedFrame.color}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="サイズ"
                  defaultValue={selectedFrame.size}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    defaultValue={selectedFrame.status}
                    label="ステータス"
                  >
                    {Object.entries(statusMap).map(([status, config]) => (
                      <MenuItem key={status} value={status}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="保管場所"
                  defaultValue={selectedFrame.location}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>キャンセル</Button>
          <Button variant="contained" onClick={() => setEditDialog(false)}>
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};