import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Container,
  Breadcrumbs,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CameraAlt as CameraIcon,
  Note as NoteIcon,
  Edit as EditIcon,
  ShoppingCart as ShoppingCartIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  AddPhotoAlternate as AddPhotoIcon,
} from '@mui/icons-material';
import { Customer, Prescription, CustomerImage, TabPanelProps } from '@/types';
import { CameraCapture } from '@/components/CameraCapture';

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`customer-tabpanel-${index}`}
    aria-labelledby={`customer-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [images, setImages] = useState<CustomerImage[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetailDialog, setOrderDetailDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [memoText, setMemoText] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerData(id);
    }
  }, [id]);

  const fetchCustomerData = async (customerId: string) => {
    setIsLoading(true);
    try {
      // 顧客管理サービスを使用
      const { customerService } = await import('@/services/customer.service');

      // 顧客詳細取得
      const customerResponse = await customerService.getCustomerById(customerId);
      if (customerResponse.success && customerResponse.data) {
        setCustomer(customerResponse.data);
        setMemoText(customerResponse.data.notes || '');
      } else {
        console.error('顧客データ取得エラー:', customerResponse.error);
        return;
      }

      // 処方箋取得
      const prescriptionResponse = await customerService.getCustomerPrescriptions(customerId);
      if (prescriptionResponse.success && prescriptionResponse.data) {
        setPrescriptions(prescriptionResponse.data);
      }

      // 画像取得
      const imageResponse = await customerService.getCustomerImages(customerId);
      if (imageResponse.success && imageResponse.data) {
        setImages(imageResponse.data);
      }

      // 購入履歴取得
      const ordersResponse = await customerService.getCustomerOrders(customerId);
      if (ordersResponse.success && ordersResponse.data) {
        setOrders(ordersResponse.data);
      }

    } catch (error) {
      console.error('顧客データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      ordered: '受注',
      prescription_done: '処方確定',
      purchase_ordered: '発注済',
      lens_received: 'レンズ入荷',
      in_production: '加工中',
      ready: '完成',
      completed: '受渡完了',
      delivered: '納品済',
      cancelled: 'キャンセル'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' => {
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'> = {
      ordered: 'info',
      prescription_done: 'primary',
      purchase_ordered: 'primary',
      lens_received: 'primary',
      in_production: 'warning',
      ready: 'success',
      completed: 'success',
      delivered: 'success',
      cancelled: 'error'
    };
    return colorMap[status] || 'default';
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setOrderDetailDialog(true);
  };

  const handleSaveMemo = async () => {
    if (!id) return;

    setIsSavingMemo(true);
    try {
      const { customerService } = await import('@/services/customer.service');
      const response = await customerService.updateCustomer(id, { notes: memoText });

      if (response.success) {
        alert('メモを保存しました');
        // 顧客データを再取得
        await fetchCustomerData(id);
      } else {
        alert('メモの保存に失敗しました: ' + (response.error?.message || '不明なエラー'));
      }
    } catch (error) {
      console.error('メモ保存エラー:', error);
      alert('メモの保存中にエラーが発生しました');
    } finally {
      setIsSavingMemo(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setIsUploadingImage(true);

    try {
      const { customerService } = await import('@/services/customer.service');
      const response = await customerService.uploadCustomerImage(id, file, {
        title: file.name,
        imageType: 'photo'
      });

      if (response.success) {
        alert('画像をアップロードしました');
        // 画像リストを再取得
        await fetchCustomerData(id);
      } else {
        alert('画像のアップロードに失敗しました: ' + (response.error?.message || '不明なエラー'));
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロード中にエラーが発生しました');
    } finally {
      setIsUploadingImage(false);
      // ファイル選択をリセット
      event.target.value = '';
    }
  };

  const handleCameraCapture = async (file: File) => {
    if (!id) return;

    setIsUploadingImage(true);

    try {
      const { customerService } = await import('@/services/customer.service');
      const response = await customerService.uploadCustomerImage(id, file, {
        title: `カメラ撮影_${new Date().toLocaleDateString('ja-JP')}`,
        imageType: 'photo'
      });

      if (response.success) {
        alert('画像をアップロードしました');
        // 画像リストを再取得
        await fetchCustomerData(id);
      } else {
        alert('画像のアップロードに失敗しました: ' + (response.error?.message || '不明なエラー'));
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロード中にエラーが発生しました');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id || !window.confirm('この画像を削除しますか？')) return;

    try {
      const { customerService } = await import('@/services/customer.service');
      const response = await customerService.deleteCustomerImage(id, imageId);

      if (response.success) {
        alert('画像を削除しました');
        // 画像リストを再取得
        await fetchCustomerData(id);
      } else {
        alert('画像の削除に失敗しました: ' + (response.error?.message || '不明なエラー'));
      }
    } catch (error) {
      console.error('画像削除エラー:', error);
      alert('画像の削除中にエラーが発生しました');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          顧客が見つかりません
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" onClick={() => navigate('/customers')} sx={{ cursor: 'pointer' }}>
          顧客管理
        </Link>
        <Typography color="text.primary">顧客詳細</Typography>
      </Breadcrumbs>

      {/* Customer Header */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" fontWeight="500" sx={{ mb: 1 }}>
              {customer.fullName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              カルテ番号: {customer.customerCode}
            </Typography>
          </Box>
          <Box display="flex" gap={1.5}>
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={() => navigate(`/customers/${id}/edit`)}
            >
              編集
            </Button>
            <Button 
              variant="contained" 
              color="secondary"
              onClick={() => navigate(`/orders/new?customerId=${id}`)}
            >
              受注入力
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate(`/customers/${id}/prescriptions/new`)}
            >
              処方箋作成
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Tabs Container */}
      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'transparent',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '16px',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
            },
          }}
        >
          <Tab label="基本情報" />
          <Tab label="視力・度数" />
          <Tab label="購入履歴" />
          <Tab label="メモ・画像" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      <Card sx={{ p: 3 }}>
        <TabPanel value={tabValue} index={0}>
          {/* 基本情報 */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'grey.50', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  個人情報
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">氏名</Typography>
                    <Typography variant="body2">{customer.fullName}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">フリガナ</Typography>
                    <Typography variant="body2">{customer.fullNameKana}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">生年月日</Typography>
                    <Typography variant="body2">
                      {customer.birthDate ? new Date(customer.birthDate).toLocaleDateString('ja-JP') : '-'} ({customer.age}歳)
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">性別</Typography>
                    <Typography variant="body2">{customer.gender === 'male' ? '男性' : '女性'}</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'grey.50', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon />
                  連絡先
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">電話番号</Typography>
                    <Typography variant="body2">{customer.phone}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">携帯番号</Typography>
                    <Typography variant="body2">{customer.mobile || '-'}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">メール</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{customer.email}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Typography variant="body2" color="text.secondary">住所</Typography>
                    <Typography variant="body2" sx={{ textAlign: 'right' }}>
                      〒{customer.postalCode}<br />
                      {customer.address}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'grey.50', p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon />
                  来店情報
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">登録店舗</Typography>
                    <Typography variant="body2">
                      {customer.registeredStore ? customer.registeredStore.name : '-'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">初回来店</Typography>
                    <Typography variant="body2">
                      {customer.firstVisitDate ? new Date(customer.firstVisitDate).toLocaleDateString('ja-JP') : '-'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">最終来店</Typography>
                    <Typography variant="body2">
                      {customer.lastVisitDate ? new Date(customer.lastVisitDate).toLocaleDateString('ja-JP') : '-'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">来店回数</Typography>
                    <Typography variant="body2">{customer.visitCount}回</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">累計購入額</Typography>
                    <Typography variant="body2">{formatCurrency(customer.totalPurchaseAmount)}</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* 視力・度数 */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">処方箋履歴</Typography>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => navigate(`/customers/${id}/prescriptions/new`)}
            >
              新規測定
            </Button>
          </Box>
          
          {prescriptions.length > 0 ? (
            prescriptions.map((prescription) => (
              <Card key={prescription.id} sx={{ mb: 2, bgcolor: 'grey.50', p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {new Date(prescription.measuredDate).toLocaleDateString('ja-JP')} 測定
                  </Typography>
                  <Chip label="最新" size="small" color="success" />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'white' }}>
                      <Typography variant="h6" gutterBottom>右眼 (R)</Typography>
                      <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">S (球面)</Typography>
                          <Typography variant="body1" fontWeight="bold">{prescription.rightEyeSphere}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">C (円柱)</Typography>
                          <Typography variant="body1" fontWeight="bold">{prescription.rightEyeCylinder}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">AX (軸)</Typography>
                          <Typography variant="body1" fontWeight="bold">{prescription.rightEyeAxis}°</Typography>
                        </Grid>
                      </Grid>
                      <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.300' }}>
                        <Typography variant="caption" color="text.secondary">矯正視力</Typography>
                        <Typography variant="body1" fontWeight="bold">{prescription.rightEyeVision}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'white' }}>
                      <Typography variant="h6" gutterBottom>左眼 (L)</Typography>
                      <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">S (球面)</Typography>
                          <Typography variant="body1" fontWeight="bold">{prescription.leftEyeSphere}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">C (円柱)</Typography>
                          <Typography variant="body1" fontWeight="bold">{prescription.leftEyeCylinder}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">AX (軸)</Typography>
                          <Typography variant="body1" fontWeight="bold">{prescription.leftEyeAxis}°</Typography>
                        </Grid>
                      </Grid>
                      <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.300' }}>
                        <Typography variant="caption" color="text.secondary">矯正視力</Typography>
                        <Typography variant="body1" fontWeight="bold">{prescription.leftEyeVision}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.300' }}>
                  <Typography variant="caption" color="text.secondary">瞳孔間距離 (PD)</Typography>
                  <Typography variant="h6" fontWeight="bold">{prescription.pupilDistance}mm</Typography>
                </Box>
                
                {prescription.notes && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.300' }}>
                    <Typography variant="caption" color="text.secondary">備考</Typography>
                    <Typography variant="body2">{prescription.notes}</Typography>
                  </Box>
                )}
              </Card>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              処方箋情報がありません
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* 購入履歴 */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCartIcon />
              購入履歴
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate(`/orders/new?customerId=${id}`)}
            >
              新規受注
            </Button>
          </Box>

          {orders.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>受注番号</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>受注日</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>納品予定日</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ステータス</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>合計金額</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>入金額</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>残高</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell>
                        {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('ja-JP') : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(order.status)}
                          color={getStatusColor(order.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {formatCurrency(order.paidAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{
                            fontWeight: order.balanceAmount > 0 ? 'bold' : 'normal',
                            color: order.balanceAmount > 0 ? 'error.main' : 'text.primary'
                          }}
                        >
                          {formatCurrency(order.balanceAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title="詳細表示">
                          <IconButton
                            size="small"
                            onClick={() => handleViewOrder(order)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <ShoppingCartIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                購入履歴がありません
              </Typography>
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                onClick={() => navigate(`/orders/new?customerId=${id}`)}
              >
                最初の受注を登録
              </Button>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* メモ・画像 */}
          <Box sx={{ mb: 3 }}>
            <Card sx={{ bgcolor: '#fff9c4', border: '2px dashed #ffc107', p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditIcon />
                  メモ
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<NoteIcon />}
                  onClick={handleSaveMemo}
                  disabled={isSavingMemo}
                >
                  {isSavingMemo ? '保存中...' : '保存'}
                </Button>
              </Box>
              <Box
                component="textarea"
                sx={{
                  width: '100%',
                  minHeight: 200,
                  border: 'none',
                  bgcolor: 'transparent',
                  fontFamily: 'Courier New, monospace',
                  fontSize: 16,
                  resize: 'vertical',
                  outline: 'none',
                  p: 0
                }}
                placeholder="顧客に関するメモをここに記入してください...&#10;&#10;- フレームの好み&#10;- アレルギー情報&#10;- 特記事項など"
                value={memoText}
                onChange={(e: any) => setMemoText(e.target.value)}
              />
            </Card>
          </Box>
          
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CameraIcon />
              画像管理
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              顧客の顔写真、現在使用中の眼鏡、処方箋などの画像を保存できます
            </Typography>
            
            <Grid container spacing={2}>
              {images.map((image) => (
                <Grid item xs={6} sm={4} md={3} key={image.id}>
                  <Card sx={{ position: 'relative' }}>
                    <Box
                      sx={{
                        height: 150,
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        backgroundImage: image.imageUrl ? `url(${image.imageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {!image.imageUrl && <CameraIcon sx={{ fontSize: 40, color: 'grey.400' }} />}
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(255,255,255,0.8)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                        }}
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          p: 0.5,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption">
                          {new Date(image.capturedDate || image.createdAt).toLocaleDateString('ja-JP')}
                        </Typography>
                      </Box>
                    </Box>
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {image.title}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}

              {/* カメラで撮影ボタン */}
              <Grid item xs={6} sm={4} md={3}>
                <Card
                  onClick={() => !isUploadingImage && setCameraDialogOpen(true)}
                  sx={{
                    border: '2px dashed #4caf50',
                    bgcolor: isUploadingImage ? '#e8f5e9' : '#f5f5f5',
                    cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                    '&:hover': { bgcolor: isUploadingImage ? '#e8f5e9' : '#c8e6c9' },
                    height: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CameraIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#4caf50' }}>
                    {isUploadingImage ? 'アップロード中...' : 'カメラで撮影'}
                  </Typography>
                </Card>
              </Grid>

              {/* 画像アップロードボタン */}
              <Grid item xs={6} sm={4} md={3}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload-input"
                  type="file"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                <label htmlFor="image-upload-input">
                  <Card
                    component="div"
                    sx={{
                      border: '2px dashed #1976d2',
                      bgcolor: isUploadingImage ? '#e3f2fd' : '#f5f5f5',
                      cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                      '&:hover': { bgcolor: isUploadingImage ? '#e3f2fd' : '#bbdefb' },
                      height: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <AddPhotoIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2" color="primary.main">
                      {isUploadingImage ? 'アップロード中...' : '画像を選択'}
                    </Typography>
                  </Card>
                </label>
              </Grid>
            </Grid>
          </Card>
        </TabPanel>
      </Card>

      {/* 受注詳細ダイアログ */}
      <Dialog
        open={orderDetailDialog}
        onClose={() => setOrderDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              受注詳細 - {selectedOrder?.orderNumber}
            </Typography>
            <IconButton onClick={() => setOrderDetailDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Grid container spacing={3}>
              {/* 基本情報 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  基本情報
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">受注番号</Typography>
                    <Typography variant="body1">{selectedOrder.orderNumber}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">受注日</Typography>
                    <Typography variant="body1">
                      {new Date(selectedOrder.orderDate).toLocaleDateString('ja-JP')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">納品予定日</Typography>
                    <Typography variant="body1">
                      {selectedOrder.deliveryDate
                        ? new Date(selectedOrder.deliveryDate).toLocaleDateString('ja-JP')
                        : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">ステータス</Typography>
                    <Chip
                      label={getStatusLabel(selectedOrder.status)}
                      color={getStatusColor(selectedOrder.status)}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* 受注明細 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  受注明細
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>商品名</TableCell>
                        <TableCell align="right">数量</TableCell>
                        <TableCell align="right">単価</TableCell>
                        <TableCell align="right">金額</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.product?.name || '-'}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* 金額情報 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  金額情報
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">小計</Typography>
                    <Typography variant="body1">{formatCurrency(selectedOrder.subtotalAmount)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">消費税</Typography>
                    <Typography variant="body1">{formatCurrency(selectedOrder.taxAmount)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">合計金額</Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">入金額</Typography>
                    <Typography variant="body1">{formatCurrency(selectedOrder.paidAmount)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">残高</Typography>
                    <Typography
                      variant="h6"
                      color={selectedOrder.balanceAmount > 0 ? 'error' : 'success.main'}
                      fontWeight="bold"
                    >
                      {formatCurrency(selectedOrder.balanceAmount)}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* 備考 */}
              {selectedOrder.notes && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      備考
                    </Typography>
                    <Typography variant="body2">{selectedOrder.notes}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailDialog(false)}>閉じる</Button>
          <Button
            variant="contained"
            onClick={() => {
              setOrderDetailDialog(false);
              navigate('/orders');
            }}
          >
            受注一覧へ
          </Button>
        </DialogActions>
      </Dialog>

      {/* カメラ撮影ダイアログ */}
      <CameraCapture
        open={cameraDialogOpen}
        onClose={() => setCameraDialogOpen(false)}
        onCapture={handleCameraCapture}
      />

    </Container>
  );
};

export default CustomerDetailPage;