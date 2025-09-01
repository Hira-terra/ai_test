import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  InputAdornment,
  Pagination,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
  Divider,
  Container,
  Fab,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Store as StoreIcon,
  CalendarToday as CalendarIcon,
  CreditCard as CardIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { Customer, CustomerSearchParams, PaginationInfo } from '@/types';
import { customerService } from '@/services/customer.service';
import MockBanner from '@/components/MockBanner';

const CustomerSearchPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({
    search: '',
    page: 1,
    limit: 50,
    sort: 'name',
  });
  
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<string>('fullName');
  
  const [searchType, setSearchType] = useState<'simple' | 'detailed'>('simple');
  const [searchScope, setSearchScope] = useState({
    myStore: true,
    allStores: false,
  });
  
  const [detailedSearch, setDetailedSearch] = useState({
    phone: '',
    address: '',
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchCustomers = async (params?: CustomerSearchParams) => {
    setIsLoading(true);
    try {
      const searchParam = params || searchParams;
      // @MOCK_TO_API: モックサービス経由でのデータ取得
      const response = await customerService.searchCustomers(searchParam);
      
      if (response.success && response.data) {
        setCustomers(response.data);
        if (response.meta?.pagination) {
          setPagination(response.meta.pagination);
        }
      } else {
        console.error('顧客検索エラー:', response.error?.message);
        setCustomers([]);
      }
    } catch (error) {
      console.error('顧客検索エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    const newSearchParams = { 
      ...searchParams, 
      page: 1,
      sort: `${sortBy}_${sortOrder}`,
      ownStoreOnly: searchScope.myStore,
      // 詳細検索パラメーターも追加
      phone: detailedSearch.phone || undefined,
      address: detailedSearch.address || undefined,
    };
    setSearchParams(newSearchParams);
    setShowResults(true);
    searchCustomers(newSearchParams);
  };

  // ページ変更時のみ検索実行
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    const newSearchParams = { ...searchParams, page: value };
    setSearchParams(newSearchParams);
    searchCustomers(newSearchParams);
  };

  const handleCustomerView = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { 
      style: 'currency', 
      currency: 'JPY' 
    }).format(amount);
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* @MOCK_UI: モック使用時のバナー表示 */}
      <MockBanner message="顧客データはモックデータです" />
      
      {/* Search Section - Compact Design */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1" fontWeight="500">
            顧客検索
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/customers/new')}
            sx={{ textTransform: 'none' }}
          >
            新規顧客登録
          </Button>
        </Box>
        
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          {/* Main Search Row */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            {/* Search Input */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                value={searchParams.search}
                onChange={(e) => setSearchParams(prev => ({ ...prev, search: e.target.value }))}
                placeholder="お名前・フリガナ、電話番号、カルテ番号で検索"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { height: 48 }
                }}
              />
            </Grid>
            
            {/* Search Type */}
            <Grid item xs={12} md={3}>
              <RadioGroup
                row
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'simple' | 'detailed')}
                sx={{ justifyContent: 'center' }}
              >
                <FormControlLabel 
                  value="simple" 
                  control={<Radio size="small" />} 
                  label="簡単検索"
                  sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                <FormControlLabel 
                  value="detailed" 
                  control={<Radio size="small" />} 
                  label="詳細検索"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
              </RadioGroup>
            </Grid>
            
            {/* Search Button */}
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={isLoading}
                sx={{
                  height: 48,
                  textTransform: 'none',
                  fontSize: 16,
                }}
              >
                {isLoading ? '検索中...' : '検索'}
              </Button>
            </Grid>
          </Grid>

          {/* Detailed Search Fields */}
          {searchType === 'detailed' && (
            <Grid container spacing={2} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="電話番号"
                  value={detailedSearch.phone}
                  onChange={(e) => setDetailedSearch(prev => ({ ...prev, phone: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="住所（一部）"
                  value={detailedSearch.address}
                  onChange={(e) => setDetailedSearch(prev => ({ ...prev, address: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          )}

          {/* Search Scope */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, pt: 1, borderTop: 1, borderColor: 'grey.200' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              検索範囲:
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={searchScope.myStore}
                    onChange={(e) => setSearchScope({ 
                      myStore: e.target.checked, 
                      allStores: e.target.checked ? false : searchScope.allStores 
                    })}
                  />
                }
                label="自店舗のみ (新宿本店)"
                sx={{ mr: 2, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={searchScope.allStores}
                    onChange={(e) => setSearchScope({ 
                      allStores: e.target.checked, 
                      myStore: e.target.checked ? false : searchScope.myStore 
                    })}
                  />
                }
                label="全店舗"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </FormGroup>
          </Box>
        </Box>
      </Card>

      {/* Results Section */}
      {showResults && (
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">検索結果</Typography>
            <Typography variant="body2" color="text.secondary">
              {pagination.total}件見つかりました
            </Typography>
          </Box>

          {/* 表示件数とソート設定 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>表示件数</InputLabel>
                <Select
                  value={searchParams.limit}
                  label="表示件数"
                  onChange={(e) => setSearchParams(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                >
                  <MenuItem value={25}>25件</MenuItem>
                  <MenuItem value={50}>50件</MenuItem>
                  <MenuItem value={100}>100件</MenuItem>
                  <MenuItem value={200}>200件</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>ソート</InputLabel>
                <Select
                  value={sortBy}
                  label="ソート"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="fullName">氏名</MenuItem>
                  <MenuItem value="customerCode">カルテ番号</MenuItem>
                  <MenuItem value="lastVisitDate">最終来店日</MenuItem>
                  <MenuItem value="visitCount">来店回数</MenuItem>
                  <MenuItem value="totalPurchaseAmount">購入額</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '昇順' : '降順'}
              </Button>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}件
            </Typography>
          </Box>

          {/* 検索結果テーブル */}
          <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'fullName'}
                      direction={sortBy === 'fullName' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('fullName')}
                    >
                      氏名
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'customerCode'}
                      direction={sortBy === 'customerCode' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('customerCode')}
                    >
                      カルテ番号
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>連絡先</TableCell>
                  <TableCell>年齢</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'lastVisitDate'}
                      direction={sortBy === 'lastVisitDate' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('lastVisitDate')}
                    >
                      最終来店日
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortBy === 'visitCount'}
                      direction={sortBy === 'visitCount' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('visitCount')}
                    >
                      来店回数
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortBy === 'totalPurchaseAmount'}
                      direction={sortBy === 'totalPurchaseAmount' ? sortOrder : 'asc'}
                      onClick={() => setSortBy('totalPurchaseAmount')}
                    >
                      累計購入額
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>登録店舗</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleCustomerView(customer.id)}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="500">
                          {customer.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.fullNameKana}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={customer.customerCode} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {customer.phone && (
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 12 }} />
                            {customer.phone}
                          </Typography>
                        )}
                        {customer.email && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {customer.email}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {customer.birthDate ? (
                        <Box>
                          <Typography variant="body2">{calculateAge(customer.birthDate)}歳</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.gender === 'male' ? '男性' : '女性'}
                          </Typography>
                        </Box>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {customer.lastVisitDate ? 
                          new Date(customer.lastVisitDate).toLocaleDateString('ja-JP') : 
                          '未来店'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="500">
                        {customer.visitCount}回
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="500">
                        {formatCurrency(customer.totalPurchaseAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {customer.registeredStore?.name || '未設定'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCustomerView(customer.id);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </Card>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
        }}
        onClick={() => navigate('/customers/new')}
      >
        <AddIcon sx={{ fontSize: 32 }} />
      </Fab>
    </Container>
  );
};

export default CustomerSearchPage;