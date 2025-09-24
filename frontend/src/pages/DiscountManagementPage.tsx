import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  Grid,
  Autocomplete,
  FormHelperText,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ja from 'date-fns/locale/ja';
import { Discount, DiscountType, DiscountTarget } from '../types';
import { discountService } from '../services/discount.service';

const DiscountManagementPage: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState<Partial<Discount>>({
    discountCode: '',
    name: '',
    description: '',
    type: 'percentage' as DiscountType,
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: undefined,
    applicableTo: 'order' as DiscountTarget,
    productCategoryFilter: [],
    customerTypeFilter: [],
    validFrom: undefined,
    validTo: undefined,
    requiresManagerApproval: false,
    maxUsesPerCustomer: undefined,
    maxUsesTotal: undefined,
    currentUses: 0,
    displayOrder: 0,
    isActive: true,
  });
  const [tabValue, setTabValue] = useState(0);

  // 値引き一覧取得
  const fetchDiscounts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await discountService.getAllDiscounts();
      if (response.success && response.data) {
        setDiscounts(response.data.discounts || []);
      } else {
        setError(response.error?.message || '値引き一覧の取得に失敗しました');
      }
    } catch (err) {
      setError('値引き一覧の取得に失敗しました');
      console.error('Error fetching discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  // ダイアログ開閉
  const handleOpenDialog = (discount?: Discount) => {
    if (discount) {
      setEditMode(true);
      setSelectedDiscount(discount);
      setFormData({
        discountCode: discount.discountCode,
        name: discount.name,
        description: discount.description,
        type: discount.type,
        value: discount.value,
        minOrderAmount: discount.minOrderAmount,
        maxDiscountAmount: discount.maxDiscountAmount,
        applicableTo: discount.applicableTo,
        productCategoryFilter: discount.productCategoryFilter || [],
        customerTypeFilter: discount.customerTypeFilter || [],
        validFrom: discount.validFrom,
        validTo: discount.validTo,
        requiresManagerApproval: discount.requiresManagerApproval,
        maxUsesPerCustomer: discount.maxUsesPerCustomer,
        maxUsesTotal: discount.maxUsesTotal,
        currentUses: discount.currentUses,
        displayOrder: discount.displayOrder,
        isActive: discount.isActive,
      });
    } else {
      setEditMode(false);
      setSelectedDiscount(null);
      setFormData({
        discountCode: '',
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        minOrderAmount: 0,
        maxDiscountAmount: undefined,
        applicableTo: 'order',
        productCategoryFilter: [],
        customerTypeFilter: [],
        validFrom: undefined,
        validTo: undefined,
        requiresManagerApproval: false,
        maxUsesPerCustomer: undefined,
        maxUsesTotal: undefined,
        currentUses: 0,
        displayOrder: 0,
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedDiscount(null);
    setFormData({
      discountCode: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      minOrderAmount: 0,
      maxDiscountAmount: undefined,
      applicableTo: 'order',
      productCategoryFilter: [],
      customerTypeFilter: [],
      validFrom: undefined,
      validTo: undefined,
      requiresManagerApproval: false,
      maxUsesPerCustomer: undefined,
      maxUsesTotal: undefined,
      currentUses: 0,
      displayOrder: 0,
      isActive: true,
    });
    setTabValue(0);
  };

  // フォーム入力変更
  const handleFormChange = (field: keyof Discount, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 保存処理
  const handleSave = async () => {
    try {
      let response;
      if (editMode && selectedDiscount) {
        response = await discountService.updateDiscount(selectedDiscount.id, formData);
      } else {
        response = await discountService.createDiscount(formData as Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>);
      }

      if (response.success) {
        await fetchDiscounts();
        handleCloseDialog();
      } else {
        setError(response.error?.message || '保存に失敗しました');
      }
    } catch (err) {
      setError('保存に失敗しました');
      console.error('Error saving discount:', err);
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!window.confirm('この値引きを削除しますか？')) {
      return;
    }

    try {
      const response = await discountService.deleteDiscount(id);
      if (response.success) {
        await fetchDiscounts();
      } else {
        setError(response.error?.message || '削除に失敗しました');
      }
    } catch (err) {
      setError('削除に失敗しました');
      console.error('Error deleting discount:', err);
    }
  };

  // 値引きタイプの表示名を取得
  const getDiscountTypeLabel = (type: DiscountType) => {
    switch (type) {
      case 'percentage':
        return 'パーセント';
      case 'amount':
        return '金額';
      case 'special':
        return '特別';
      default:
        return type;
    }
  };

  // 適用対象の表示名を取得
  const getApplicableToLabel = (target: DiscountTarget) => {
    return target === 'order' ? '受注全体' : '明細個別';
  };

  // カテゴリフィルタオプション
  const productCategories = ['frame', 'lens', 'contact', 'accessory', 'hearing_aid'];
  const customerTypes = ['general', 'member', 'vip', 'staff'];

  // 値引き値の表示形式
  const formatDiscountValue = (discount: Discount) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    }
    return `¥${discount.value.toLocaleString()}`;
  };

  // 金額のフォーマット
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === 0) return '-';
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            値引きマスタ管理
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            新規登録
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>コード</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell>タイプ</TableCell>
                  <TableCell align="right">値</TableCell>
                  <TableCell align="center">適用対象</TableCell>
                  <TableCell align="right">最低注文額</TableCell>
                  <TableCell align="right">最大割引額</TableCell>
                  <TableCell align="center">使用回数</TableCell>
                  <TableCell align="center">有効期間</TableCell>
                  <TableCell align="center">店長承認</TableCell>
                  <TableCell align="center">状態</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>{discount.discountCode}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{discount.name}</Typography>
                        {discount.description && (
                          <Typography variant="caption" color="text.secondary">
                            {discount.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getDiscountTypeLabel(discount.type)}
                        size="small"
                        color={discount.type === 'percentage' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{formatDiscountValue(discount)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getApplicableToLabel(discount.applicableTo)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(discount.minOrderAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(discount.maxDiscountAmount)}</TableCell>
                    <TableCell align="center">
                      {discount.maxUsesTotal ? (
                        <Typography variant="caption">
                          {discount.currentUses}/{discount.maxUsesTotal}
                        </Typography>
                      ) : (
                        <Typography variant="caption">{discount.currentUses}/−</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption">
                        {discount.validFrom || discount.validTo ? (
                          <>
                            {discount.validFrom ? new Date(discount.validFrom).toLocaleDateString('ja-JP') : '−'}
                            <br />
                            ～
                            <br />
                            {discount.validTo ? new Date(discount.validTo).toLocaleDateString('ja-JP') : '−'}
                          </>
                        ) : (
                          '制限なし'
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {discount.requiresManagerApproval ? (
                        <Chip label="必要" size="small" color="warning" />
                      ) : (
                        <Chip label="不要" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={discount.isActive ? '有効' : '無効'}
                        size="small"
                        color={discount.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(discount)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(discount.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {discounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        値引きデータがありません
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* 値引き登録・編集ダイアログ */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editMode ? '値引き編集' : '値引き新規登録'}
          </DialogTitle>
          <DialogContent>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                  <Tab label="基本情報" />
                  <Tab label="適用条件" />
                  <Tab label="利用制限" />
                </Tabs>
              </Box>

              {/* 基本情報タブ */}
              {tabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="値引きコード"
                      value={formData.discountCode || ''}
                      onChange={(e) => handleFormChange('discountCode', e.target.value)}
                      fullWidth
                      required
                      disabled={editMode}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="表示順"
                      type="number"
                      value={formData.displayOrder || 0}
                      onChange={(e) => handleFormChange('displayOrder', Number(e.target.value))}
                      fullWidth
                      helperText="一覧表示時の並び順"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="名称"
                      value={formData.name || ''}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="説明"
                      value={formData.description || ''}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>タイプ</InputLabel>
                      <Select
                        value={formData.type || 'percentage'}
                        onChange={(e) => handleFormChange('type', e.target.value as DiscountType)}
                        label="タイプ"
                      >
                        <MenuItem value="percentage">パーセント</MenuItem>
                        <MenuItem value="amount">金額</MenuItem>
                        <MenuItem value="special">特別</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="値"
                      type="number"
                      value={formData.value || 0}
                      onChange={(e) => handleFormChange('value', Number(e.target.value))}
                      fullWidth
                      required
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {formData.type === 'percentage' ? '%' : '円'}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>適用対象</InputLabel>
                      <Select
                        value={formData.applicableTo || 'order'}
                        onChange={(e) => handleFormChange('applicableTo', e.target.value as DiscountTarget)}
                        label="適用対象"
                      >
                        <MenuItem value="order">受注全体</MenuItem>
                        <MenuItem value="item">明細個別</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="最低注文額"
                      type="number"
                      value={formData.minOrderAmount || 0}
                      onChange={(e) => handleFormChange('minOrderAmount', Number(e.target.value))}
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">円</InputAdornment>,
                      }}
                    />
                  </Grid>
                  {formData.type === 'percentage' && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="最大割引額"
                        type="number"
                        value={formData.maxDiscountAmount || ''}
                        onChange={(e) => handleFormChange('maxDiscountAmount', e.target.value ? Number(e.target.value) : undefined)}
                        fullWidth
                        InputProps={{
                          endAdornment: <InputAdornment position="end">円</InputAdornment>,
                        }}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.requiresManagerApproval || false}
                          onChange={(e) => handleFormChange('requiresManagerApproval', e.target.checked)}
                        />
                      }
                      label="店長承認が必要"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive !== false}
                          onChange={(e) => handleFormChange('isActive', e.target.checked)}
                        />
                      }
                      label="有効"
                    />
                  </Grid>
                </Grid>
              )}

              {/* 適用条件タブ */}
              {tabValue === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={productCategories}
                      value={formData.productCategoryFilter || []}
                      onChange={(e, newValue) => handleFormChange('productCategoryFilter', newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="商品カテゴリフィルタ"
                          helperText="選択したカテゴリの商品のみ適用（空の場合は全てに適用）"
                        />
                      )}
                      getOptionLabel={(option) => {
                        switch (option) {
                          case 'frame': return 'フレーム';
                          case 'lens': return 'レンズ';
                          case 'contact': return 'コンタクト';
                          case 'accessory': return 'アクセサリー';
                          case 'hearing_aid': return '補聴器';
                          default: return option;
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={customerTypes}
                      value={formData.customerTypeFilter || []}
                      onChange={(e, newValue) => handleFormChange('customerTypeFilter', newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="顧客タイプフィルタ"
                          helperText="選択したタイプの顧客のみ適用（空の場合は全てに適用）"
                        />
                      )}
                      getOptionLabel={(option) => {
                        switch (option) {
                          case 'general': return '一般';
                          case 'member': return 'メンバー';
                          case 'vip': return 'VIP';
                          case 'staff': return 'スタッフ';
                          default: return option;
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              )}

              {/* 利用制限タブ */}
              {tabValue === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="有効開始日"
                      value={formData.validFrom ? new Date(formData.validFrom) : null}
                      onChange={(newValue) => handleFormChange('validFrom', newValue?.toISOString())}
                      slots={{
                        textField: (params) => <TextField {...params} fullWidth />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="有効終了日"
                      value={formData.validTo ? new Date(formData.validTo) : null}
                      onChange={(newValue) => handleFormChange('validTo', newValue?.toISOString())}
                      slots={{
                        textField: (params) => <TextField {...params} fullWidth />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="顧客あたり最大利用回数"
                      type="number"
                      value={formData.maxUsesPerCustomer || ''}
                      onChange={(e) => handleFormChange('maxUsesPerCustomer', e.target.value ? Number(e.target.value) : undefined)}
                      fullWidth
                      helperText="空の場合は制限なし"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="全体最大利用回数"
                      type="number"
                      value={formData.maxUsesTotal || ''}
                      onChange={(e) => handleFormChange('maxUsesTotal', e.target.value ? Number(e.target.value) : undefined)}
                      fullWidth
                      helperText="空の場合は制限なし"
                    />
                  </Grid>
                  {editMode && (
                    <Grid item xs={12}>
                      <TextField
                        label="現在の利用回数"
                        type="number"
                        value={formData.currentUses || 0}
                        fullWidth
                        disabled
                        helperText="システムで自動カウントされます"
                      />
                    </Grid>
                  )}
                </Grid>
              )}
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>キャンセル</Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              {editMode ? '更新' : '登録'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DiscountManagementPage;