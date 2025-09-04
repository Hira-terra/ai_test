import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  FormControlLabel,
  Switch,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

import { userService } from '../services/user.service';
import { storeService } from '../services/store.service';
import { 
  User, 
  UserRole, 
  Store,
  CreateUserRequest,
  UpdateUserRequest,
  UserSearchParams
} from '../types';

const UserMasterPage: React.FC = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Search and filter state
  const [searchParams, setSearchParams] = useState<UserSearchParams>({
    page: 1,
    limit: 50
  });

  // Form state
  const [formData, setFormData] = useState<CreateUserRequest | UpdateUserRequest>({
    userCode: '',
    name: '',
    email: '',
    password: '',
    role: 'staff',
    storeId: '',
    isActive: true
  });

  // Load initial data
  useEffect(() => {
    loadUsers();
    loadStores();
  }, [searchParams]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userService.getUsers(searchParams);
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error?.message || 'ユーザーの取得に失敗しました');
      }
    } catch (error: any) {
      setError(error.message || 'ユーザーの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const stores = await storeService.getAllStores();
      setStores(stores);
    } catch (error: any) {
      console.error('店舗の取得に失敗:', error);
    }
  };

  // Dialog handlers
  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email || '',
        role: user.role,
        isActive: user.isActive,
        password: '' // パスワードは空で開始
      });
    } else {
      setEditingUser(null);
      setFormData({
        userCode: '',
        name: '',
        email: '',
        password: '',
        role: 'staff',
        storeId: '',
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      userCode: '',
      name: '',
      email: '',
      password: '',
      role: 'staff',
      storeId: '',
      isActive: true
    });
    setShowPassword(false);
  };

  // Form submission
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      
      if (editingUser) {
        // Update existing user
        response = await userService.updateUser(editingUser.id, formData as UpdateUserRequest);
      } else {
        // Create new user
        response = await userService.createUser(formData as CreateUserRequest);
      }

      if (response.success) {
        setSuccess(editingUser ? 'ユーザーを更新しました' : 'ユーザーを作成しました');
        handleCloseDialog();
        await loadUsers(); // Reload users
      } else {
        setError(response.error?.message || '処理に失敗しました');
      }
    } catch (error: any) {
      setError(error.message || '処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Form field change handler
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: CreateUserRequest | UpdateUserRequest) => ({
      ...prev,
      [field]: value
    }));
  };

  // Search handler
  const handleSearch = () => {
    setSearchParams((prev: UserSearchParams) => ({ ...prev, page: 1 }));
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin': return '管理者';
      case 'manager': return '店長';
      case 'staff': return 'スタッフ';
      default: return role;
    }
  };

  const getRoleColor = (role: UserRole): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'staff': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: 'primary.main' }}>
        👥 担当者マスタ管理
      </Typography>

      {/* Alert messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Search and Actions Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>店舗</InputLabel>
                <Select
                  value={searchParams.storeId || ''}
                  label="店舗"
                  onChange={(e) => setSearchParams((prev: UserSearchParams) => ({ ...prev, storeId: e.target.value || undefined }))}
                >
                  <MenuItem value="">すべての店舗</MenuItem>
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>役職</InputLabel>
                <Select
                  value={searchParams.role || ''}
                  label="役職"
                  onChange={(e) => setSearchParams((prev: UserSearchParams) => ({ ...prev, role: e.target.value || undefined }))}
                >
                  <MenuItem value="">すべての役職</MenuItem>
                  <MenuItem value="admin">管理者</MenuItem>
                  <MenuItem value="manager">店長</MenuItem>
                  <MenuItem value="staff">スタッフ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>状態</InputLabel>
                <Select
                  value={searchParams.isActive === undefined ? '' : String(searchParams.isActive)}
                  label="状態"
                  onChange={(e) => setSearchParams((prev: UserSearchParams) => ({ 
                    ...prev, 
                    isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
                  }))}
                >
                  <MenuItem value="">すべて</MenuItem>
                  <MenuItem value="true">有効</MenuItem>
                  <MenuItem value="false">無効</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  fullWidth
                >
                  検索
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadUsers}
                >
                  更新
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              ユーザー一覧 ({users.length}件)
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              color="primary"
            >
              新規ユーザー
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.light' }}>
                  <TableCell><strong>ユーザーコード</strong></TableCell>
                  <TableCell><strong>名前</strong></TableCell>
                  <TableCell><strong>メール</strong></TableCell>
                  <TableCell><strong>役職</strong></TableCell>
                  <TableCell><strong>店舗</strong></TableCell>
                  <TableCell><strong>状態</strong></TableCell>
                  <TableCell><strong>最終ログイン</strong></TableCell>
                  <TableCell><strong>操作</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      ユーザーが見つかりません
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.userCode}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user.store?.name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? '有効' : '無効'}
                          color={user.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="編集">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(user)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'ユーザー編集' : '新規ユーザー作成'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              {!editingUser && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="ユーザーコード *"
                    value={(formData as CreateUserRequest).userCode || ''}
                    onChange={(e) => handleFieldChange('userCode', e.target.value)}
                    placeholder="例: staff001"
                  />
                </Grid>
              )}
              <Grid item xs={12} md={editingUser ? 12 : 6}>
                <TextField
                  fullWidth
                  label="名前 *"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={editingUser ? "新しいパスワード" : "パスワード *"}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>役職 *</InputLabel>
                  <Select
                    value={formData.role}
                    label="役職 *"
                    onChange={(e) => handleFieldChange('role', e.target.value)}
                  >
                    <MenuItem value="staff">スタッフ</MenuItem>
                    <MenuItem value="manager">店長</MenuItem>
                    <MenuItem value="admin">管理者</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {!editingUser && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>店舗 *</InputLabel>
                    <Select
                      value={(formData as CreateUserRequest).storeId}
                      label="店舗 *"
                      onChange={(e) => handleFieldChange('storeId', e.target.value)}
                    >
                      {stores.map((store) => (
                        <MenuItem key={store.id} value={store.id}>
                          {store.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive !== false}
                      onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                    />
                  }
                  label="有効"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name || (!editingUser && (!(formData as CreateUserRequest).userCode || !formData.password || !(formData as CreateUserRequest).storeId))}
          >
            {loading ? '処理中...' : (editingUser ? '更新' : '作成')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserMasterPage;