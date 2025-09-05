import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Breadcrumbs,
  Link,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { CreateCustomerRequest, Store } from '@/types';
import { customerService } from '@/services/customer.service';
import { storeService } from '@/services/store.service';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerFormData {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  gender?: 'male' | 'female' | 'other';
  birthDate: string;
  phone?: string;
  mobile?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  notes?: string;
  registeredStoreId?: string;
}

const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isEditMode = !!id;
  const [formData, setFormData] = useState<CustomerFormData>({
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    gender: undefined,
    birthDate: '',
    phone: '',
    mobile: '',
    email: '',
    postalCode: '',
    address: '',
    notes: '',
    registeredStoreId: user?.store?.id, // デフォルトは現在ユーザーの店舗
  });
  
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 店舗データを取得
  useEffect(() => {
    fetchStoresData();
  }, []);

  // 編集モードの場合、顧客データを取得
  useEffect(() => {
    if (isEditMode && id) {
      fetchCustomerData(id);
    }
  }, [isEditMode, id]);

  const fetchStoresData = async () => {
    try {
      const storesData = await storeService.getAllStores();
      setStores(storesData);
    } catch (error) {
      console.error('店舗データ取得エラー:', error);
    }
  };

  const fetchCustomerData = async (customerId: string) => {
    setIsLoading(true);
    try {
      const { customerService } = await import('@/services/customer.service');
      const response = await customerService.getCustomerById(customerId);
      
      if (response.success && response.data) {
        const customer = response.data;
        setFormData({
          lastName: customer.lastName,
          firstName: customer.firstName,
          lastNameKana: customer.lastNameKana || '',
          firstNameKana: customer.firstNameKana || '',
          gender: customer.gender,
          birthDate: customer.birthDate || '',
          phone: customer.phone || '',
          mobile: customer.mobile || '',
          email: customer.email || '',
          postalCode: customer.postalCode || '',
          address: customer.address || '',
          notes: customer.notes || '',
          registeredStoreId: customer.registeredStoreId,
        });
      } else {
        setError('顧客データの取得に失敗しました。');
      }
    } catch (error) {
      console.error('顧客データ取得エラー:', error);
      setError('顧客データの取得中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // エラーをクリア
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.lastName.trim()) {
      setError('姓を入力してください。');
      return false;
    }
    if (!formData.firstName.trim()) {
      setError('名を入力してください。');
      return false;
    }
    if (!formData.lastNameKana.trim()) {
      setError('姓（カナ）を入力してください。');
      return false;
    }
    if (!formData.firstNameKana.trim()) {
      setError('名（カナ）を入力してください。');
      return false;
    }
    if (!formData.registeredStoreId) {
      setError('登録店舗を選択してください。');
      return false;
    }
    
    // 電話番号またはメールアドレスのどちらか必須
    if (!formData.phone?.trim() && !formData.mobile?.trim() && !formData.email?.trim()) {
      setError('電話番号またはメールアドレスのいずれかを入力してください。');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const customerData: CreateCustomerRequest = {
        lastName: formData.lastName.trim(),
        firstName: formData.firstName.trim(),
        fullName: `${formData.lastName.trim()} ${formData.firstName.trim()}`,
        lastNameKana: formData.lastNameKana.trim(),
        firstNameKana: formData.firstNameKana.trim(),
        fullNameKana: formData.lastNameKana.trim() && formData.firstNameKana.trim() 
          ? `${formData.lastNameKana.trim()} ${formData.firstNameKana.trim()}` 
          : undefined,
        gender: formData.gender,
        birthDate: formData.birthDate,
        phone: formData.phone?.trim() || undefined,
        mobile: formData.mobile?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        postalCode: formData.postalCode?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        registeredStoreId: formData.registeredStoreId
      };
      
      console.log('🔍 送信データ:', customerData);
      console.log('🔍 registeredStoreId:', customerData.registeredStoreId);
      console.log('🔍 編集モード:', isEditMode);
      console.log('🔍 顧客ID:', id);
      
      const response = isEditMode 
        ? await customerService.updateCustomer(id!, customerData)
        : await customerService.createCustomer(customerData);
      
      if (response.success && response.data) {
        setSuccess(true);
        // 3秒後に顧客詳細ページに遷移
        setTimeout(() => {
          navigate(`/customers/${response.data!.id}`);
        }, 2000);
      } else {
        setError(response.error?.message || `顧客の${isEditMode ? '更新' : '登録'}に失敗しました。`);
      }
    } catch (error) {
      console.error('顧客登録エラー:', error);
      setError('予期しないエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            顧客{isEditMode ? '更新' : '登録'}が完了しました！
          </Typography>
          <Typography variant="body2">
            顧客詳細ページに移動します...
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" onClick={() => navigate('/customers')} sx={{ cursor: 'pointer' }}>
          顧客管理
        </Link>
        <Typography color="text.primary">{isEditMode ? '顧客情報編集' : '新規顧客登録'}</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="500" sx={{ mb: 1 }}>
          {isEditMode ? '顧客情報編集' : '新規顧客登録'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEditMode ? '顧客の情報を変更してください' : '新しい顧客の情報を入力してください'}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            {/* 基本情報 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon />
                基本情報
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="姓"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    placeholder="山田"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="名"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    placeholder="太郎"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="姓（カナ）"
                    value={formData.lastNameKana}
                    onChange={handleInputChange('lastNameKana')}
                    placeholder="ヤマダ"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="名（カナ）"
                    value={formData.firstNameKana}
                    onChange={handleInputChange('firstNameKana')}
                    placeholder="タロウ"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>性別</InputLabel>
                    <Select
                      value={formData.gender || ''}
                      onChange={handleInputChange('gender')}
                      label="性別"
                    >
                      <MenuItem value="">選択しない</MenuItem>
                      <MenuItem value="male">男性</MenuItem>
                      <MenuItem value="female">女性</MenuItem>
                      <MenuItem value="other">その他</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="生年月日"
                    value={formData.birthDate}
                    onChange={handleInputChange('birthDate')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>登録店舗</InputLabel>
                    <Select
                      value={formData.registeredStoreId || ''}
                      onChange={handleInputChange('registeredStoreId')}
                      label="登録店舗"
                    >
                      {stores.map((store) => (
                        <MenuItem key={store.id} value={store.id}>
                          {store.name} ({store.storeCode})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 連絡先情報 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon />
                連絡先情報
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ※ 電話番号またはメールアドレスのいずれかは必須です
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="電話番号"
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                    placeholder="03-1234-5678"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="携帯番号"
                    value={formData.mobile}
                    onChange={handleInputChange('mobile')}
                    placeholder="090-1234-5678"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="email"
                    label="メールアドレス"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    placeholder="example@example.com"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 住所情報 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon />
                住所情報
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="郵便番号"
                    value={formData.postalCode}
                    onChange={handleInputChange('postalCode')}
                    placeholder="123-4567"
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="住所"
                    value={formData.address}
                    onChange={handleInputChange('address')}
                    placeholder="東京都新宿区新宿1-1-1"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* メモ */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                メモ
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="備考・注意事項"
                value={formData.notes}
                onChange={handleInputChange('notes')}
                placeholder="アレルギー情報、好み、その他注意事項など"
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', pt: 2 }}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                sx={{ minWidth: 140 }}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                disabled={isLoading}
                sx={{ minWidth: 140 }}
              >
{isLoading ? (isEditMode ? '更新中...' : '登録中...') : (isEditMode ? '更新' : '登録')}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CustomerCreatePage;