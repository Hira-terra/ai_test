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
  Grid,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Stack,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Fax as FaxIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { supplierAPIService } from '../services/api/supplier.service';
import { useAuth } from '../contexts/AuthContext';
import type { Supplier } from '../types';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const orderMethodMap: Record<string, { label: string; color: ChipColor; icon: React.ReactElement }> = {
  edi: { label: 'EDI', color: 'primary', icon: <AssessmentIcon /> },
  csv: { label: 'CSV', color: 'info', icon: <CloudUploadIcon /> },
  fax: { label: 'FAX', color: 'warning', icon: <FaxIcon /> },
  email: { label: 'Email', color: 'secondary', icon: <EmailIcon /> }
};

export const SupplierManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    supplierCode: '',
    name: '',
    contactInfo: '',
    orderMethod: 'email' as 'edi' | 'csv' | 'fax' | 'email',
    isActive: true
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await supplierAPIService.getAllSuppliers();
      if (response.success && response.data) {
        setSuppliers(response.data);
      } else {
        setError('仕入先の取得に失敗しました');
      }
    } catch (err) {
      console.error('仕入先取得エラー:', err);
      setError('仕入先の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (supplier?: Supplier) => {
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData({
        supplierCode: supplier.supplierCode,
        name: supplier.name,
        contactInfo: supplier.contactInfo || '',
        orderMethod: supplier.orderMethod,
        isActive: supplier.isActive
      });
    } else {
      setSelectedSupplier(null);
      setFormData({
        supplierCode: '',
        name: '',
        contactInfo: '',
        orderMethod: 'email',
        isActive: true
      });
    }
    setEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialog(false);
    setSelectedSupplier(null);
    setError(null);
  };

  const handleSave = async () => {
    try {
      if (selectedSupplier) {
        // 更新
        const response = await supplierAPIService.updateSupplier(selectedSupplier.id, formData);
        if (!response.success) {
          throw new Error(response.error?.message || '更新に失敗しました');
        }
      } else {
        // 新規作成
        const response = await supplierAPIService.createSupplier(formData);
        if (!response.success) {
          throw new Error(response.error?.message || '作成に失敗しました');
        }
      }

      handleCloseEditDialog();
      loadSuppliers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog(false);
    setSelectedSupplier(null);
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      const response = await supplierAPIService.deleteSupplier(selectedSupplier.id);
      if (!response.success) {
        throw new Error(response.error?.message || '削除に失敗しました');
      }

      handleCloseDeleteDialog();
      loadSuppliers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFormChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <BusinessIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h4" component="h1">
            仕入先マスタ管理
          </Typography>
        </Stack>
        <Typography variant="body1" color="textSecondary">
          仕入先の情報を管理します。発注方式や連絡先情報を設定できます。
        </Typography>
      </Paper>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 統計情報 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                総仕入先数
              </Typography>
              <Typography variant="h4">
                {suppliers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                有効仕入先
              </Typography>
              <Typography variant="h4" color="success.main">
                {suppliers.filter(s => s.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                EDI連携
              </Typography>
              <Typography variant="h4" color="primary.main">
                {suppliers.filter(s => s.orderMethod === 'edi').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">
                CSV発注
              </Typography>
              <Typography variant="h4" color="info.main">
                {suppliers.filter(s => s.orderMethod === 'csv').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 仕入先一覧 */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            仕入先一覧
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenEditDialog()}
            disabled={loading}
          >
            新規追加
          </Button>
        </Box>

        <Divider />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>仕入先コード</TableCell>
                <TableCell>仕入先名</TableCell>
                <TableCell>発注方式</TableCell>
                <TableCell>連絡先</TableCell>
                <TableCell>状態</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    仕入先が登録されていません
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id} hover>
                    <TableCell>{supplier.supplierCode}</TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">
                        {supplier.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={orderMethodMap[supplier.orderMethod].icon}
                        label={orderMethodMap[supplier.orderMethod].label}
                        color={orderMethodMap[supplier.orderMethod].color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {supplier.contactInfo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={supplier.isActive ? '有効' : '無効'}
                        color={supplier.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditDialog(supplier)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(supplier)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 編集ダイアログ */}
      <Dialog open={editDialog} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedSupplier ? '仕入先編集' : '新規仕入先追加'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="仕入先コード"
                value={formData.supplierCode}
                onChange={(e) => handleFormChange('supplierCode', e.target.value)}
                required
                disabled={!!selectedSupplier}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="仕入先名"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="連絡先情報"
                value={formData.contactInfo}
                onChange={(e) => handleFormChange('contactInfo', e.target.value)}
                multiline
                rows={3}
                placeholder="住所、電話番号、FAX等の連絡先情報"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>発注方式</InputLabel>
                <Select
                  value={formData.orderMethod}
                  onChange={(e) => handleFormChange('orderMethod', e.target.value)}
                  label="発注方式"
                >
                  <MenuItem value="edi">EDI</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="fax">FAX</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                  />
                }
                label="有効状態"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.supplierCode.trim() || !formData.name.trim()}
          >
            {selectedSupplier ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>削除確認</DialogTitle>
        <DialogContent>
          <Typography>
            仕入先「{selectedSupplier?.name}」を削除してもよろしいですか？
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            この操作は取り消せません。関連する発注データがある場合は削除できません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};