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
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CameraAlt as CameraIcon,
  Note as NoteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Customer, Prescription, CustomerImage, TabPanelProps } from '@/types';

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
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
          <Typography variant="h6" gutterBottom>購入履歴</Typography>
          <Typography variant="body2" color="text.secondary">
            購入履歴情報は今後実装予定です
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* メモ・画像 */}
          <Box sx={{ mb: 3 }}>
            <Card sx={{ bgcolor: '#fff9c4', border: '2px dashed #ffc107', p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditIcon />
                  手書きメモ
                </Typography>
                <Button variant="outlined" size="small" startIcon={<NoteIcon />}>
                  保存
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
                defaultValue={customer.notes || ''}
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
                  <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}>
                    <Box 
                      sx={{ 
                        height: 150, 
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}
                    >
                      <CameraIcon sx={{ fontSize: 40, color: 'grey.400' }} />
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
              
              {/* 画像アップロードボタン */}
              <Grid item xs={6} sm={4} md={3}>
                <Card 
                  sx={{ 
                    border: '2px dashed #1976d2', 
                    bgcolor: '#e3f2fd',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#bbdefb' },
                    height: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CameraIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="body2" color="primary.main">
                    画像を選択
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Card>
        </TabPanel>
      </Card>

    </Container>
  );
};

export default CustomerDetailPage;