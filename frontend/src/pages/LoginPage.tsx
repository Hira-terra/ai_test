import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Store as StoreIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { LoginRequest, Store } from '@/types';
import { storeService } from '@/services/store.service';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<LoginRequest>({
    user_code: '',
    password: '',
    store_code: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // 店舗一覧取得
  useEffect(() => {
    const loadStores = async () => {
      console.log('🏪 店舗一覧の取得を開始');
      console.log('🌐 API_BASE_URL:', process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api');
      try {
        const stores = await storeService.getAllStores();
        console.log('✅ 店舗一覧取得成功:', stores);
        console.log('📊 取得した店舗数:', stores.length);
        setStores(stores);
      } catch (error: any) {
        console.error('❌ 店舗一覧の取得に失敗しました:', error);
        console.error('📍 エラーの詳細:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        setError(`店舗一覧の取得に失敗しました: ${error.message}`);
      } finally {
        console.log('🏁 店舗一覧取得処理終了');
        setLoadingStores(false);
      }
    };

    loadStores();
  }, []);

  const handleInputChange = (field: keyof LoginRequest) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.user_code || !formData.password || !formData.store_code) {
      setError('すべての項目を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'ログインに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // テスト用認証情報入力機能
  const fillTestCredentials = (userType: 'staff' | 'manager' | 'admin') => {
    const testCredentials: Record<string, LoginRequest> = {
      staff: {
        user_code: 'staff001',
        password: 'password',
        store_code: 'STORE001',
      },
      manager: {
        user_code: 'manager001',
        password: 'password',
        store_code: 'STORE001',
      },
      admin: {
        user_code: 'admin001',
        password: 'password',
        store_code: 'HQ001',
      },
    };

    setFormData(testCredentials[userType]);
    setError(null);
  };


  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100vh"
        >
          <Typography>読み込み中...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        py={4}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                ログイン
              </Typography>
              <Typography variant="body2" color="text.secondary">
                眼鏡店顧客管理システム
              </Typography>
            </Box>

            {/* テスト用認証情報入力ボタン */}
            {process.env.NODE_ENV === 'development' && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>テスト用認証情報:</strong>
                </Typography>
                <Typography variant="caption" display="block" sx={{ mb: 1, color: 'text.secondary' }}>
                  ボタンをクリックしてテスト用の認証情報を入力できます
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button 
                    size="small"
                    variant="outlined"
                    onClick={() => fillTestCredentials('staff')}
                    sx={{ minWidth: 80 }}
                  >
                    店員
                  </Button>
                  <Button 
                    size="small"
                    variant="outlined"
                    onClick={() => fillTestCredentials('manager')}
                    sx={{ minWidth: 80 }}
                  >
                    店長
                  </Button>
                  <Button 
                    size="small"
                    variant="outlined"
                    onClick={() => fillTestCredentials('admin')}
                    sx={{ minWidth: 80 }}
                  >
                    管理者
                  </Button>
                </Box>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box display="flex" flexDirection="column" gap={3}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <FormControl fullWidth required>
                  <InputLabel id="store-select-label">店舗</InputLabel>
                  <Select
                    labelId="store-select-label"
                    value={formData.store_code}
                    label="店舗"
                    onChange={(e) => setFormData(prev => ({ ...prev, store_code: e.target.value }))}
                    disabled={loadingStores}
                    startAdornment={
                      <InputAdornment position="start">
                        <StoreIcon color="primary" />
                      </InputAdornment>
                    }
                  >
                    {loadingStores ? (
                      <MenuItem disabled>読み込み中...</MenuItem>
                    ) : stores.length === 0 ? (
                      <MenuItem disabled>店舗データがありません</MenuItem>
                    ) : (
                      stores.map((store) => (
                        <MenuItem key={store.id} value={store.storeCode}>
                          {store.storeCode} - {store.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="ユーザーコード"
                  value={formData.user_code}
                  onChange={handleInputChange('user_code')}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="例: U001"
                />

                <TextField
                  fullWidth
                  label="パスワード"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={togglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  {isSubmitting ? 'ログイン中...' : 'ログイン'}
                </Button>
              </Box>
            </form>

            <Box mt={4} textAlign="center">
              <Typography variant="caption" color="text.secondary">
                システムに関するお問い合わせは、システム管理者までご連絡ください。
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginPage;