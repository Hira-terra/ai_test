import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Box,
  Chip,
  IconButton,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  QrCodeScanner as QrCodeIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { PurchaseOrderItem, Frame } from '../types';

interface IndividualItem {
  id: string;
  serialNumber: string;
  color: string;
  size: string;
  status: 'in_stock' | 'reserved' | 'sold' | 'damaged' | 'transferred';
  location: string;
  tempId?: string; // 新規作成時の一時ID
}

interface IndividualItemAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  purchaseOrderItem: PurchaseOrderItem | null;
  onSave: (items: IndividualItem[]) => Promise<void>;
}

const frameStatuses = [
  { value: 'in_stock', label: '在庫中', color: 'success' as const },
  { value: 'reserved', label: '予約済み', color: 'warning' as const },
  { value: 'sold', label: '販売済み', color: 'default' as const },
  { value: 'damaged', label: '破損', color: 'error' as const },
  { value: 'transferred', label: '移管済み', color: 'info' as const }
];

const frameSizes = ['XS', 'S', 'M', 'L', 'XL'];

export const IndividualItemAssignmentDialog: React.FC<IndividualItemAssignmentDialogProps> = ({
  open,
  onClose,
  purchaseOrderItem,
  onSave
}) => {
  const [items, setItems] = useState<IndividualItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ダイアログが開かれた時に初期データを設定
  useEffect(() => {
    if (open && purchaseOrderItem) {
      initializeItems();
    }
  }, [open, purchaseOrderItem]);

  const initializeItems = () => {
    if (!purchaseOrderItem) return;

    const quantity = purchaseOrderItem.quantity || 1;
    const newItems: IndividualItem[] = [];

    for (let i = 0; i < quantity; i++) {
      newItems.push({
        id: '',
        serialNumber: generateSerialNumber(i + 1),
        color: '未指定',
        size: 'M',
        status: 'in_stock',
        location: 'メイン倉庫',
        tempId: `temp-${Date.now()}-${i}`
      });
    }

    setItems(newItems);
  };

  const generateSerialNumber = (index: number): string => {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timepart = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // ランダム3桁
    const storeCode = 'ST01'; // 将来的に店舗コードで動的設定
    const productCode = purchaseOrderItem?.product?.productCode || 'UNKNOWN';
    
    // 商品コード-店舗コード-日付-時分秒-ランダム-連番 形式（ユニーク性向上）
    return `${productCode}-${storeCode}-${timestamp}-${timepart}-${randomPart}-${String(index).padStart(3, '0')}`;
  };

  const handleItemChange = (tempId: string, field: keyof IndividualItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    const newItem: IndividualItem = {
      id: '',
      serialNumber: generateSerialNumber(items.length + 1),
      color: '未指定',
      size: 'M', 
      status: 'in_stock',
      location: 'メイン倉庫',
      tempId: `temp-${Date.now()}-${items.length}`
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleScanQR = (tempId: string) => {
    // QRコードスキャン機能（将来実装）
    alert('QRコードスキャン機能は今後実装予定です');
  };

  const validateItems = (): boolean => {
    if (items.length === 0) {
      setError('少なくとも1つの個体を登録してください');
      return false;
    }

    const serialNumbers = items.map(item => item.serialNumber);
    const duplicates = serialNumbers.filter((serial, index) => serialNumbers.indexOf(serial) !== index);
    
    if (duplicates.length > 0) {
      setError(`個体番号が重複しています: ${duplicates.join(', ')}`);
      return false;
    }

    const emptyFields = items.some(item => !item.serialNumber.trim() || !item.color.trim());
    if (emptyFields) {
      setError('個体番号と色は必須項目です');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateItems()) return;

    setLoading(true);
    try {
      await onSave(items);
      onClose();
    } catch (err) {
      setError('個体登録に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setItems([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <QrCodeIcon color="primary" />
          <Typography variant="h6">
            個体番号割り当て - {purchaseOrderItem?.product?.name}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {purchaseOrderItem && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">商品コード</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {purchaseOrderItem.product?.productCode}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">商品名</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {purchaseOrderItem.product?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">発注数</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {purchaseOrderItem.quantity} 個
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">管理方式</Typography>
                  <Chip label="個体管理" color="primary" size="small" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">個体一覧 ({items.length}個)</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            size="small"
          >
            個体追加
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width="25%">個体番号</TableCell>
                <TableCell width="15%">色</TableCell>
                <TableCell width="10%">サイズ</TableCell>
                <TableCell width="15%">ステータス</TableCell>
                <TableCell width="20%">保管場所</TableCell>
                <TableCell width="15%" align="center">アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.tempId}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TextField
                        size="small"
                        value={item.serialNumber}
                        onChange={(e) => handleItemChange(item.tempId!, 'serialNumber', e.target.value)}
                        placeholder="個体番号"
                        fullWidth
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => handleScanQR(item.tempId!)}
                        title="QRコードスキャン"
                      >
                        <QrCodeIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.color}
                      onChange={(e) => handleItemChange(item.tempId!, 'color', e.target.value)}
                      placeholder="色"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={item.size}
                        onChange={(e) => handleItemChange(item.tempId!, 'size', e.target.value)}
                      >
                        {frameSizes.map(size => (
                          <MenuItem key={size} value={size}>{size}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={item.status}
                        onChange={(e) => handleItemChange(item.tempId!, 'status', e.target.value as any)}
                      >
                        {frameStatuses.map(status => (
                          <MenuItem key={status.value} value={status.value}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.location}
                      onChange={(e) => handleItemChange(item.tempId!, 'location', e.target.value)}
                      placeholder="保管場所"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleRemoveItem(item.tempId!)}
                      disabled={items.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {items.length === 0 && (
          <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
            <Typography color="textSecondary">
              「個体追加」ボタンをクリックして個体を登録してください
            </Typography>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleCancel} 
          startIcon={<CancelIcon />}
          disabled={loading}
        >
          キャンセル
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          startIcon={<SaveIcon />}
          disabled={loading || items.length === 0}
        >
          {loading ? '登録中...' : `${items.length}個の個体を登録`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};