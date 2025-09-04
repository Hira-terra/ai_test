// Page ID: M-001 商品マスタ管理ページ
import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Product, ProductCategory, ManagementType, PaginationInfo } from '@/types';
import { productService } from '@/services/product.service';

const ProductMasterPage: React.FC = () => {
  // データ状態
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // フィルタ状態
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | ''>('');
  const [managementTypeFilter, setManagementTypeFilter] = useState<ManagementType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');

  // UI状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // フォーム状態（新規作成・編集用）
  const [formData, setFormData] = useState({
    productCode: '',
    name: '',
    brand: '',
    category: 'frame' as ProductCategory,
    managementType: 'individual' as ManagementType,
    costPrice: 0,
    retailPrice: 0,
    supplier: '',
    isActive: true,
  });

  // 初期化
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await productService.getProducts({
        page: pagination.page,
        limit: pagination.limit,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
        isActive: activeFilter !== '' ? activeFilter : undefined,
        managementType: managementTypeFilter || undefined,
      });

      if (response.success && response.data) {
        setProducts(response.data);
        if (response.meta?.pagination) {
          setPagination(response.meta.pagination);
        }
      } else {
        throw new Error(response.error?.message || '商品一覧の取得に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadProducts();
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPagination(prev => ({ ...prev, page: value }));
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setDetailDialog(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      productCode: product.productCode,
      name: product.name,
      brand: product.brand || '',
      category: product.category,
      managementType: product.managementType,
      costPrice: product.costPrice || 0,
      retailPrice: product.retailPrice,
      supplier: product.supplier || '',
      isActive: product.isActive,
    });
    setEditDialog(true);
  };

  const handleCreateProduct = () => {
    setFormData({
      productCode: '',
      name: '',
      brand: '',
      category: 'frame',
      managementType: 'individual',
      costPrice: 0,
      retailPrice: 0,
      supplier: '',
      isActive: true,
    });
    setCreateDialog(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialog(true);
  };

  const handleFormSubmit = async () => {
    try {
      if (editDialog && selectedProduct) {
        // 編集処理
        const response = await productService.updateProduct(selectedProduct.id, formData);
        if (response.success) {
          setEditDialog(false);
          loadProducts();
        } else {
          throw new Error(response.error?.message || '商品更新に失敗しました。');
        }
      } else if (createDialog) {
        // 新規作成処理
        const response = await productService.createProduct(formData);
        if (response.success) {
          setCreateDialog(false);
          loadProducts();
        } else {
          throw new Error(response.error?.message || '商品作成に失敗しました。');
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      const response = await productService.deleteProduct(selectedProduct.id);
      if (response.success) {
        setDeleteDialog(false);
        loadProducts();
      } else {
        throw new Error(response.error?.message || '商品削除に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getCategoryLabel = (category: ProductCategory) => {
    switch (category) {
      case 'frame': return '👓 フレーム';
      case 'lens': return '🔍 レンズ';
      case 'contact': return '👁️ コンタクト';
      case 'accessory': return '🎒 アクセサリー';
      case 'hearing_aid': return '🦻 補聴器';
      default: return category;
    }
  };

  const getManagementTypeLabel = (type: ManagementType) => {
    switch (type) {
      case 'individual': return '🏷️ 個品管理';
      case 'quantity': return '📦 数量管理';
      case 'stock': return '📋 在庫管理なし';
      default: return type;
    }
  };

  const getManagementTypeColor = (type: ManagementType) => {
    switch (type) {
      case 'individual': return 'primary';
      case 'quantity': return 'success';
      case 'stock': return 'warning';
      default: return 'default';
    }
  };

  const getManagementTypeDescription = (type: ManagementType) => {
    switch (type) {
      case 'individual': return 'シリアル番号で1点ずつ管理（棚卸し対象）';
      case 'quantity': return '商品コード毎に数量で管理（棚卸し対象）';
      case 'stock': return '在庫管理対象外（メーカー提供品など、棚卸し対象外）';
      default: return '';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          商品マスタ管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateProduct}
        >
          新規商品登録
        </Button>
      </Box>

      {/* 検索・フィルタエリア */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="商品名・商品コード・ブランド検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="FRAME001 または Ray-Ban"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>カテゴリ</InputLabel>
                <Select
                  value={categoryFilter}
                  label="カテゴリ"
                  onChange={(e) => setCategoryFilter(e.target.value as ProductCategory)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="frame">👓 フレーム</MenuItem>
                  <MenuItem value="lens">🔍 レンズ</MenuItem>
                  <MenuItem value="contact">👁️ コンタクト</MenuItem>
                  <MenuItem value="accessory">🎒 アクセサリー</MenuItem>
                  <MenuItem value="hearing_aid">🦻 補聴器</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>管理方式</InputLabel>
                <Select
                  value={managementTypeFilter}
                  label="管理方式"
                  onChange={(e) => setManagementTypeFilter(e.target.value as ManagementType)}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="individual">🏷️ 個品管理</MenuItem>
                  <MenuItem value="quantity">📦 数量管理</MenuItem>
                  <MenuItem value="stock">📋 在庫管理なし</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={activeFilter === '' ? '' : activeFilter.toString()}
                  label="ステータス"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') setActiveFilter('');
                    else if (value === 'true') setActiveFilter(true);
                    else if (value === 'false') setActiveFilter(false);
                  }}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="true">有効</MenuItem>
                  <MenuItem value="false">無効</MenuItem>
                </Select>
              </FormControl>
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

      {/* 商品一覧テーブル */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">商品一覧</Typography>
            <Typography variant="body2" color="text.secondary">
              {pagination.total}件見つかりました
            </Typography>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>商品コード</TableCell>
                  <TableCell>商品名</TableCell>
                  <TableCell>ブランド</TableCell>
                  <TableCell>カテゴリ</TableCell>
                  <TableCell>管理方式</TableCell>
                  <TableCell align="right">販売価格</TableCell>
                  <TableCell align="right">仕入価格</TableCell>
                  <TableCell>サプライヤー</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {product.productCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {product.brand || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getCategoryLabel(product.category)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getManagementTypeLabel(product.managementType)}
                        color={getManagementTypeColor(product.managementType) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {product.managementType === 'stock' && product.retailPrice === 0 ? 
                          <span style={{ color: '#666' }}>無償提供</span> : 
                          formatCurrency(product.retailPrice)
                        }
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {product.managementType === 'stock' && product.costPrice === 0 ? 
                        <span style={{ color: '#666' }}>無償</span> : 
                        (product.costPrice ? formatCurrency(product.costPrice) : '—')
                      }
                    </TableCell>
                    <TableCell>
                      {product.supplier || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.isActive ? '有効' : '無効'}
                        color={product.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="詳細表示">
                          <IconButton
                            size="small"
                            onClick={() => handleViewProduct(product)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="編集">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditProduct(product)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="削除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
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
        </CardContent>
      </Card>

      {/* 詳細表示ダイアログ */}
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          商品詳細 - {selectedProduct?.productCode}
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography><strong>商品名:</strong> {selectedProduct.name}</Typography>
                <Typography><strong>ブランド:</strong> {selectedProduct.brand || '—'}</Typography>
                <Typography><strong>カテゴリ:</strong> {getCategoryLabel(selectedProduct.category)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>管理方式:</strong> {getManagementTypeLabel(selectedProduct.managementType)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 2, mt: 0.5 }}>
                  {getManagementTypeDescription(selectedProduct.managementType)}
                </Typography>
                <Typography><strong>販売価格:</strong> {formatCurrency(selectedProduct.retailPrice)}</Typography>
                <Typography><strong>仕入価格:</strong> {selectedProduct.costPrice ? formatCurrency(selectedProduct.costPrice) : '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography><strong>サプライヤー:</strong> {selectedProduct.supplier || '—'}</Typography>
                <Typography><strong>ステータス:</strong> {selectedProduct.isActive ? '有効' : '無効'}</Typography>
                <Typography><strong>作成日:</strong> {new Date(selectedProduct.createdAt).toLocaleString('ja-JP')}</Typography>
                <Typography><strong>更新日:</strong> {new Date(selectedProduct.updatedAt).toLocaleString('ja-JP')}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 作成・編集ダイアログ */}
      <Dialog
        open={createDialog || editDialog}
        onClose={() => { setCreateDialog(false); setEditDialog(false); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {createDialog ? '新規商品登録' : '商品編集'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="商品コード"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="商品名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="ブランド"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>カテゴリ</InputLabel>
                <Select
                  value={formData.category}
                  label="カテゴリ"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                >
                  <MenuItem value="frame">👓 フレーム</MenuItem>
                  <MenuItem value="lens">🔍 レンズ</MenuItem>
                  <MenuItem value="contact">👁️ コンタクト</MenuItem>
                  <MenuItem value="accessory">🎒 アクセサリー</MenuItem>
                  <MenuItem value="hearing_aid">🦻 補聴器</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>管理方式</InputLabel>
                <Select
                  value={formData.managementType}
                  label="管理方式"
                  onChange={(e) => setFormData({ ...formData, managementType: e.target.value as ManagementType })}
                >
                  <MenuItem value="individual">
                    <Box>
                      <Typography>🏷️ 個品管理</Typography>
                      <Typography variant="caption" color="text.secondary">
                        シリアル番号で1点ずつ管理（棚卸し対象）
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="quantity">
                    <Box>
                      <Typography>📦 数量管理</Typography>
                      <Typography variant="caption" color="text.secondary">
                        商品コード毎に数量で管理（棚卸し対象）
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="stock">
                    <Box>
                      <Typography>📋 在庫管理なし</Typography>
                      <Typography variant="caption" color="text.secondary">
                        在庫管理対象外（メーカー提供品など、棚卸し対象外）
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="販売価格"
                type="number"
                value={formData.retailPrice}
                onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) || 0 })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="仕入価格"
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="サプライヤー"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialog(false); setEditDialog(false); }}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            {createDialog ? '登録' : '更新'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>商品削除確認</DialogTitle>
        <DialogContent>
          <Typography>
            以下の商品を削除しますか？この操作は取り消せません。
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <strong>商品コード:</strong> {selectedProduct?.productCode}<br />
            <strong>商品名:</strong> {selectedProduct?.name}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            キャンセル
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductMasterPage;