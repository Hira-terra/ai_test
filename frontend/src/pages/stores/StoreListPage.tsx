import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
import { Store, CreateStoreRequest, UpdateStoreRequest } from '../../types';
import { storeService } from '../../services/store.service';

const StoreListPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<CreateStoreRequest>({
    storeCode: '',
    name: '',
    address: '',
    phone: '',
    managerName: '',
    isActive: true
  });

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const data = await storeService.getAllStores();
      setStores(data);
    } catch (err: any) {
      setError(err.message || '店舗一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        storeCode: store.storeCode,
        name: store.name,
        address: store.address,
        phone: store.phone || '',
        managerName: store.managerName || '',
        isActive: store.isActive !== false
      });
    } else {
      setEditingStore(null);
      setFormData({
        storeCode: '',
        name: '',
        address: '',
        phone: '',
        managerName: '',
        isActive: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingStore(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingStore) {
        const updateData: UpdateStoreRequest = {
          ...formData
        };
        await storeService.updateStore(editingStore.id, updateData);
      } else {
        await storeService.createStore(formData);
      }
      handleClose();
      loadStores();
    } catch (err: any) {
      setError(err.message || '店舗の保存に失敗しました');
    }
  };

  const handleDelete = async (store: Store) => {
    if (window.confirm(`店舗「${store.name}」を削除しますか？`)) {
      try {
        await storeService.deleteStore(store.id);
        loadStores();
      } catch (err: any) {
        setError(err.message || '店舗の削除に失敗しました');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          店舗マスタ管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          新規店舗追加
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>店舗コード</TableCell>
                <TableCell>店舗名</TableCell>
                <TableCell>住所</TableCell>
                <TableCell>電話番号</TableCell>
                <TableCell>店長名</TableCell>
                <TableCell>状態</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>{store.storeCode}</TableCell>
                  <TableCell>{store.name}</TableCell>
                  <TableCell>{store.address}</TableCell>
                  <TableCell>{store.phone || '-'}</TableCell>
                  <TableCell>{store.managerName || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={store.isActive !== false ? '有効' : '無効'}
                      color={store.isActive !== false ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpen(store)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(store)}
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
      </Paper>

      {/* 店舗作成・編集ダイアログ */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingStore ? '店舗編集' : '新規店舗作成'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="店舗コード"
              value={formData.storeCode}
              onChange={(e) => setFormData({ ...formData, storeCode: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="店舗名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="住所"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              margin="normal"
              required
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="電話番号"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="店長名"
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              margin="normal"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="有効状態"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingStore ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StoreListPage;