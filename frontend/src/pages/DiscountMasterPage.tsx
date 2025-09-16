import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Percent as PercentIcon,
} from '@mui/icons-material';
import { Discount, DiscountType } from '@/types';
import { discountService } from '@/services/discount.service';


const DiscountMasterPage: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [open, setOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState<Partial<Discount>>({
    discountCode: '',
    name: '',
    type: 'percentage',
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: undefined,
    applicableTo: 'order',
    requiresManagerApproval: false,
    description: '',
    isActive: true,
    displayOrder: 0,
    currentUses: 0,
    createdBy: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const result = await discountService.getAllDiscounts();
      if (result.success && result.data) {
        setDiscounts(result.data.discounts);
      } else {
        setError(result.error?.message || '値引きマスタの読み込みに失敗しました');
      }
    } catch (error: any) {
      setError('値引きマスタの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDiscount(null);
    setFormData({
      discountCode: '',
      name: '',
      type: 'percentage',
      value: 0,
      minOrderAmount: 0,
      maxDiscountAmount: undefined,
      applicableTo: 'order',
      requiresManagerApproval: false,
      description: '',
      isActive: true,
      displayOrder: 0,
      currentUses: 0,
      createdBy: '',
    });
    setOpen(true);
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({ ...discount });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingDiscount(null);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    
    // バリデーション
    if (!formData.discountCode || !formData.name) {
      setError('割引コードと割引名は必須です');
      return;
    }
    
    if (formData.value === undefined || formData.value <= 0) {
      setError('割引値は0より大きい値を入力してください');
      return;
    }
    
    if (formData.type === 'percentage' && formData.value > 100) {
      setError('パーセント割引は100%以下で入力してください');
      return;
    }

    setLoading(true);
    try {
      if (editingDiscount) {
        // 編集
        const result = await discountService.updateDiscount(editingDiscount.id, formData);
        if (result.success) {
          await loadDiscounts(); // データを再読み込み
          handleClose();
        } else {
          setError(result.error?.message || '値引きマスタの更新に失敗しました');
        }
      } else {
        // 新規追加
        const result = await discountService.createDiscount(formData as Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>);
        if (result.success) {
          await loadDiscounts(); // データを再読み込み
          handleClose();
        } else {
          setError(result.error?.message || '値引きマスタの作成に失敗しました');
        }
      }
    } catch (error: any) {
      setError('値引きマスタの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (discount: Discount) => {
    if (!window.confirm(`値引き「${discount.name}」を削除しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await discountService.deleteDiscount(discount.id);
      if (result.success) {
        await loadDiscounts(); // データを再読み込み
      } else {
        setError(result.error?.message || '値引きマスタの削除に失敗しました');
      }
    } catch (error: any) {
      setError('値引きマスタの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '上限なし';
    return new Intl.NumberFormat('ja-JP', { 
      style: 'currency', 
      currency: 'JPY' 
    }).format(amount);
  };

  const formatDiscountValue = (discount: Discount) => {
    return discount.type === 'percentage' 
      ? `${discount.value}%`
      : formatCurrency(discount.value);
  };

  const getTypeLabel = (type: DiscountType) => {
    return type === 'percentage' ? 'パーセント' : '金額';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PercentIcon color="primary" />
          値引きマスタ管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={loading}
        >
          新規作成
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>割引コード</TableCell>
              <TableCell>割引名</TableCell>
              <TableCell>種類</TableCell>
              <TableCell>割引値</TableCell>
              <TableCell>最低注文額</TableCell>
              <TableCell>上限割引額</TableCell>
              <TableCell>店長承認</TableCell>
              <TableCell>状態</TableCell>
              <TableCell>説明</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {discounts.map((discount) => (
              <TableRow key={discount.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {discount.discountCode}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {discount.name}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getTypeLabel(discount.type)}
                    color={discount.type === 'percentage' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  {formatDiscountValue(discount)}
                </TableCell>
                <TableCell>
                  {formatCurrency(discount.minOrderAmount)}
                </TableCell>
                <TableCell>
                  {formatCurrency(discount.maxDiscountAmount ?? 0)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={discount.requiresManagerApproval ? '必要' : '不要'}
                    color={discount.requiresManagerApproval ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={discount.isActive ? '有効' : '無効'}
                    color={discount.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Tooltip title={discount.description}>
                    <Typography variant="body2" sx={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {discount.description}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(discount)}
                    disabled={loading}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(discount)}
                    disabled={loading}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 追加・編集ダイアログ */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDiscount ? '値引き編集' : '新規値引き作成'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="割引コード"
              value={formData.discountCode || ''}
              onChange={(e) => setFormData({ ...formData, discountCode: e.target.value })}
              required
              placeholder="例: PERCENT_5"
              helperText="一意の割引コードを入力してください"
            />
            
            <TextField
              label="割引名"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="例: 5%割引"
            />
            
            <FormControl required>
              <InputLabel>割引種類</InputLabel>
              <Select
                value={formData.type || 'percentage'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as DiscountType })}
                label="割引種類"
              >
                <MenuItem value="percentage">パーセント割引</MenuItem>
                <MenuItem value="amount">金額割引</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="割引値"
              type="number"
              value={formData.value || ''}
              onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              required
              helperText={formData.type === 'percentage' ? '例: 10 (10%の場合)' : '例: 1000 (1000円の場合)'}
            />
            
            <TextField
              label="最低注文額"
              type="number"
              value={formData.minOrderAmount || 0}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
              helperText="この金額以上でないと適用されません（0の場合は制限なし）"
            />
            
            <TextField
              label="上限割引額"
              type="number"
              value={formData.maxDiscountAmount ?? ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                maxDiscountAmount: e.target.value ? Number(e.target.value) : undefined 
              })}
              helperText="割引額の上限（空の場合は上限なし）"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requiresManagerApproval || false}
                  onChange={(e) => setFormData({ ...formData, requiresManagerApproval: e.target.checked })}
                />
              }
              label="店長承認が必要"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="有効"
            />
            
            <TextField
              label="説明"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              placeholder="この値引きの詳細な説明を入力してください"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscountMasterPage;