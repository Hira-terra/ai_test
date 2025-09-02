// Page ID: S-003 受注入力ページ
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import MockBanner from '@/components/MockBanner';
import { 
  Product, 
  Frame, 
  Customer, 
  Prescription, 
  PaymentMethod,
  OrderItem 
} from '@/types';
import { customerService } from '@/services/customer.service';
import { productService } from '@/services/product.service';
import { orderService } from '@/services/order.service';

const OrderEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId');

  // ステップ管理
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['顧客選択', '商品選択', '金額確認', '入金・完了'];

  // データ状態
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [orderItems, setOrderItems] = useState<Omit<OrderItem, 'id' | 'orderId'>[]>([]);
  
  // 顧客検索用の状態
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  
  // フォーム状態
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [notes, setNotes] = useState<string>('');
  
  // UI状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  
  // 商品選択用の状態
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  
  // 商品カテゴリー定義
  const productCategories = [
    { value: 'all', label: 'すべて', icon: '🔍' },
    { value: 'frame', label: 'フレーム', icon: '👓' },
    { value: 'lens', label: 'レンズ', icon: '🔍' },
    { value: 'contact', label: 'コンタクト', icon: '👁️' },
    { value: 'hearing_aid', label: '補聴器', icon: '🦻' },
    { value: 'accessory', label: 'アクセサリー', icon: '🎒' },
  ];

  // 初期化
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // @MOCK_TO_API: 顧客情報取得
        if (customerId) {
          const customerResponse = await customerService.getCustomerById(customerId);
          if (customerResponse.success && customerResponse.data) {
            setCustomer(customerResponse.data);
            setActiveStep(1); // 顧客が選択済みなので商品選択ステップへ
          }

          // @REAL_API: 最新処方箋取得
          const prescriptionResponse = await customerService.getCustomerPrescriptions(customerId);
          if (prescriptionResponse.success && prescriptionResponse.data && prescriptionResponse.data.length > 0) {
            // 最新の処方箋を取得（日付順でソート）
            const latestPrescription = prescriptionResponse.data.sort((a: any, b: any) => 
              new Date(b.measuredDate).getTime() - new Date(a.measuredDate).getTime()
            )[0];
            setPrescription(latestPrescription);
          }
        } else {
          // customerIdが無い場合は顧客選択ステップから開始
          setActiveStep(0);
        }

        // @REAL_API: 商品・フレーム情報取得
        const [productsResponse, framesResponse] = await Promise.all([
          productService.getProducts(),
          productService.getAvailableFrames()
        ]);

        if (productsResponse.success && productsResponse.data) {
          setProducts(productsResponse.data);
        }
        if (framesResponse.success && framesResponse.data) {
          setFrames(framesResponse.data);
        }

        // デフォルト納期（2週間後）
        const defaultDeliveryDate = new Date();
        defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 14);
        setDeliveryDate(defaultDeliveryDate.toISOString().split('T')[0]);

      } catch (err: any) {
        setError(err.message || 'データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [customerId]);

  // 商品追加
  const addProduct = (product: Product, selectedFrame?: Frame) => {
    const unitPrice = Math.floor(product.retailPrice); // 小数点以下を除去
    const newItem: Omit<OrderItem, 'id' | 'orderId'> = {
      productId: product.id,
      product,
      frameId: selectedFrame?.id || undefined, // nullではなくundefined
      frame: selectedFrame,
      quantity: 1,
      unitPrice: unitPrice,
      totalPrice: unitPrice,
      prescriptionId: prescription?.id || undefined, // 処方箋IDを追加
      notes: selectedFrame ? `${selectedFrame.serialNumber} (${selectedFrame.color})` : undefined // 空文字ではなくundefined
    };

    setOrderItems(prev => [...prev, newItem]);
  };

  // 商品削除
  const removeProduct = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // 数量変更
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
        : item
    ));
  };

  // 商品のフィルタリング
  const filteredProducts = products.filter(product => {
    // カテゴリーフィルター
    const categoryMatch = selectedProductCategory === 'all' || product.category === selectedProductCategory;
    
    // 検索クエリフィルター
    const searchMatch = !productSearchQuery || 
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      product.productCode.toLowerCase().includes(productSearchQuery.toLowerCase());
    
    return categoryMatch && searchMatch;
  });

  const filteredFrames = frames.filter(frame => {
    if (selectedProductCategory !== 'all' && selectedProductCategory !== 'frame') return false;
    
    const searchMatch = !productSearchQuery || 
      frame.product?.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      frame.product?.brand?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      frame.serialNumber.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      frame.color?.toLowerCase().includes(productSearchQuery.toLowerCase());
    
    return searchMatch;
  });

  // 金額計算
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = Math.floor(subtotal * 0.1);
  const totalAmount = subtotal + taxAmount;

  // 顧客検索
  const handleCustomerSearch = async () => {
    if (!customerSearchQuery.trim()) {
      setCustomerSearchResults([]);
      return;
    }

    setCustomerSearchLoading(true);
    setError(null);

    try {
      // @MOCK_TO_API: 顧客検索（全店舗対象）
      const response = await customerService.searchCustomers({
        search: customerSearchQuery,
        page: 1,
        limit: 10,
        ownStoreOnly: false // 受注入力では全店舗の顧客を検索対象にする
      });

      if (response.success && response.data) {
        setCustomerSearchResults(response.data);
      } else {
        throw new Error(response.error?.message || '顧客検索に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message);
      setCustomerSearchResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  // 顧客選択
  const handleSelectCustomer = async (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer);
    setActiveStep(1);

    // 選択した顧客の最新処方箋を取得
    try {
      const prescriptionResponse = await customerService.getCustomerPrescriptions(selectedCustomer.id);
      if (prescriptionResponse.success && prescriptionResponse.data && prescriptionResponse.data.length > 0) {
        // 最新の処方箋を取得（日付順でソート）
        const latestPrescription = prescriptionResponse.data.sort((a: any, b: any) => 
          new Date(b.measuredDate).getTime() - new Date(a.measuredDate).getTime()
        )[0];
        setPrescription(latestPrescription);
      }
    } catch (err: any) {
      console.warn('処方箋情報の取得に失敗:', err.message);
    }
  };


  // 受注作成
  const handleCreateOrder = async () => {
    if (!customer) {
      setError('顧客が選択されていません。');
      return;
    }

    if (orderItems.length === 0) {
      setError('商品が選択されていません。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // @REAL_API: 受注作成
      const orderData = {
        customerId: customer.id,
        items: orderItems.map(item => ({
          productId: item.productId,
          frameId: item.frameId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          prescriptionId: item.prescriptionId,
          notes: item.notes
        })),
        subtotalAmount: subtotal,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        paidAmount: isPartialPayment ? paidAmount : totalAmount,
        deliveryDate: deliveryDate || undefined,
        paymentMethod,
        notes: notes || undefined
      };

      console.log('🔍 DEBUG: 送信する受注データ:', JSON.stringify(orderData, null, 2));
      
      const response = await orderService.createOrder(orderData as any); // 型チェック回避

      if (response.success && response.data) {
        alert(`受注が正常に作成されました。\n受注番号: ${response.data.orderNumber}`);
        navigate('/orders');
      } else {
        throw new Error(response.error?.message || '受注の作成に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message || '受注の作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !customer) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* @MOCK_UI: モック使用バナー */}
      <MockBanner message="受注入力機能 - モックデータを使用中" />

      <Typography variant="h5" gutterBottom fontWeight="bold">
        受注入力
      </Typography>

      {/* ステップ表示 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ステップ 0: 顧客選択 */}
      {activeStep === 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              顧客選択
            </Typography>
            <Box display="flex" gap={2} mb={3}>
              <TextField
                fullWidth
                label="顧客名・顧客コード・電話番号で検索"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="山田太郎 または C-001 または 03-1234-5678"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomerSearch();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleCustomerSearch}
                disabled={customerSearchLoading || !customerSearchQuery.trim()}
              >
                {customerSearchLoading ? '検索中...' : '検索'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/customers/new')}
              >
                新規顧客登録
              </Button>
            </Box>

            {/* 検索結果 */}
            {customerSearchResults.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  検索結果 ({customerSearchResults.length}件)
                </Typography>
                {customerSearchResults.map((customer) => (
                  <Card key={customer.id} sx={{ mb: 2, cursor: 'pointer' }} 
                        onClick={() => handleSelectCustomer(customer)}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {customer.fullName}
                          </Typography>
                          <Typography color="text.secondary">
                            {customer.customerCode} | {customer.phone} | {customer.address}
                          </Typography>
                          {customer.lastVisitDate && (
                            <Typography variant="body2" color="text.secondary">
                              最終来店: {customer.lastVisitDate.split('T')[0]}
                            </Typography>
                          )}
                        </Box>
                        <Button variant="outlined" size="small">
                          選択
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {customerSearchQuery && customerSearchResults.length === 0 && !customerSearchLoading && (
              <Alert severity="info" sx={{ mt: 2 }}>
                該当する顧客が見つかりませんでした。新規顧客登録を行ってください。
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 顧客情報表示（ステップ1以降） */}
      {customer && activeStep > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                顧客情報
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setCustomer(null);
                  setPrescription(null);
                  setActiveStep(0);
                }}
              >
                顧客変更
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography><strong>氏名:</strong> {customer.fullName}</Typography>
                <Typography><strong>顧客コード:</strong> {customer.customerCode}</Typography>
                <Typography><strong>電話番号:</strong> {customer.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" gap={1} alignItems="center">
                  <Typography><strong>最新処方箋:</strong></Typography>
                  {prescription ? (
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setShowPrescriptionDialog(true)}
                    >
                      {prescription.measuredDate.split('T')[0]} 測定
                    </Button>
                  ) : (
                    <Typography color="text.secondary">なし</Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ステップ1以降: 商品選択・受注内容 */}
      {activeStep > 0 && customer && (
        <Grid container spacing={3}>
          {/* 商品選択エリア */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    商品選択
                  </Typography>
                  <Chip 
                    label={`${selectedProductCategory === 'frame' ? filteredFrames.length : filteredProducts.length}件`} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Box>

                {/* 検索ボックス */}
                <Box mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="商品名・ブランド・商品コードで検索..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: productSearchQuery && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setProductSearchQuery('')}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {/* カテゴリータブ */}
                <Box mb={2}>
                  <Tabs
                    value={selectedProductCategory}
                    onChange={(e, newValue) => setSelectedProductCategory(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ 
                      borderBottom: 1, 
                      borderColor: 'divider',
                      '& .MuiTab-root': { minHeight: '40px', fontSize: '0.875rem' }
                    }}
                  >
                    {productCategories.map((category) => (
                      <Tab
                        key={category.value}
                        value={category.value}
                        label={
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <span>{category.icon}</span>
                            <span>{category.label}</span>
                          </Box>
                        }
                      />
                    ))}
                  </Tabs>
                </Box>

                {/* 商品リスト */}
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {/* フレーム表示 */}
                  {(selectedProductCategory === 'all' || selectedProductCategory === 'frame') && (
                    <Box>
                      {filteredFrames.length > 0 ? (
                        filteredFrames.map((frame) => (
                          <Card 
                            key={frame.id} 
                            variant="outlined"
                            sx={{ mb: 1, p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box flex={1}>
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                  <Chip label="👓 フレーム" size="small" color="primary" variant="outlined" />
                                  <Typography variant="body2" fontWeight="bold">
                                    {frame.product?.name}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {frame.serialNumber} | {frame.color} | {frame.size} | {frame.product?.brand}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary.main">
                                  ¥{frame.product?.retailPrice.toLocaleString()}
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => addProduct(frame.product!, frame)}
                                sx={{ ml: 1 }}
                              >
                                追加
                              </Button>
                            </Box>
                          </Card>
                        ))
                      ) : (
                        selectedProductCategory === 'frame' && (
                          <Typography color="text.secondary" textAlign="center" py={2}>
                            該当するフレームがありません
                          </Typography>
                        )
                      )}
                    </Box>
                  )}

                  {/* その他の商品表示 */}
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <Card 
                        key={product.id} 
                        variant="outlined"
                        sx={{ mb: 1, p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <Chip 
                                label={`${productCategories.find(c => c.value === product.category)?.icon} ${productCategories.find(c => c.value === product.category)?.label}`}
                                size="small" 
                                color="secondary" 
                                variant="outlined" 
                              />
                              <Typography variant="body2" fontWeight="bold">
                                {product.name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {product.productCode} | {product.brand} | {product.category}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                              ¥{product.retailPrice.toLocaleString()}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => addProduct(product)}
                            sx={{ ml: 1 }}
                          >
                            追加
                          </Button>
                        </Box>
                      </Card>
                    ))
                  ) : (
                    selectedProductCategory !== 'frame' && selectedProductCategory !== 'all' && (
                      <Typography color="text.secondary" textAlign="center" py={2}>
                        該当する商品がありません
                      </Typography>
                    )
                  )}

                  {/* すべてのカテゴリーで商品がない場合 */}
                  {selectedProductCategory === 'all' && filteredFrames.length === 0 && filteredProducts.length === 0 && (
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      検索条件に該当する商品がありません
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

        {/* 受注内容エリア */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                受注内容
              </Typography>

              {/* 選択商品一覧 */}
              {orderItems.length > 0 ? (
                <Table size="small" sx={{ mb: 3 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>商品</TableCell>
                      <TableCell align="center">数量</TableCell>
                      <TableCell align="right">金額</TableCell>
                      <TableCell align="center">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.product?.name || '商品名不明'}
                          </Typography>
                          {item.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {item.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <Button
                              size="small"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <RemoveIcon />
                            </Button>
                            <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                            <Button
                              size="small"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                            >
                              <AddIcon />
                            </Button>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          ¥{item.totalPrice.toLocaleString()}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            color="error"
                            onClick={() => removeProduct(index)}
                          >
                            削除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  商品が選択されていません
                </Typography>
              )}

              {/* 金額計算 */}
              {orderItems.length > 0 && (
                <Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>小計:</Typography>
                    <Typography>¥{subtotal.toLocaleString()}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>消費税 (10%):</Typography>
                    <Typography>¥{taxAmount.toLocaleString()}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">合計:</Typography>
                    <Typography variant="h6" color="primary">
                      ¥{totalAmount.toLocaleString()}
                    </Typography>
                  </Box>

                  {/* 受注設定 */}
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="納期"
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>支払方法</InputLabel>
                        <Select
                          value={paymentMethod}
                          label="支払方法"
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        >
                          <MenuItem value="cash">現金</MenuItem>
                          <MenuItem value="credit">クレジットカード</MenuItem>
                          <MenuItem value="electronic">電子マネー</MenuItem>
                          <MenuItem value="receivable">売掛</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isPartialPayment}
                            onChange={(e) => {
                              setIsPartialPayment(e.target.checked);
                              if (!e.target.checked) {
                                setPaidAmount(totalAmount);
                              }
                            }}
                          />
                        }
                        label="一部入金"
                      />
                    </Grid>
                    {isPartialPayment && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="入金額"
                          type="number"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(Number(e.target.value))}
                          InputProps={{
                            startAdornment: <Typography>¥</Typography>,
                          }}
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="備考"
                        multiline
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  {/* 受注ボタン */}
                  <Box mt={3} display="flex" gap={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleCreateOrder}
                      disabled={loading || !customer || orderItems.length === 0}
                    >
                      {loading ? '処理中...' : '受注確定'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      disabled={orderItems.length === 0}
                    >
                      発注データ出力
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {/* 処方箋表示ダイアログ */}
      <Dialog
        open={showPrescriptionDialog}
        onClose={() => setShowPrescriptionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>最新処方箋情報</DialogTitle>
        <DialogContent>
          {prescription && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle1" gutterBottom>右眼</Typography>
                <Typography>球面度数 (S): {prescription.rightEyeSphere}</Typography>
                <Typography>円柱度数 (C): {prescription.rightEyeCylinder}</Typography>
                <Typography>軸 (AX): {prescription.rightEyeAxis}°</Typography>
                <Typography>矯正視力: {prescription.rightEyeVision}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1" gutterBottom>左眼</Typography>
                <Typography>球面度数 (S): {prescription.leftEyeSphere}</Typography>
                <Typography>円柱度数 (C): {prescription.leftEyeCylinder}</Typography>
                <Typography>軸 (AX): {prescription.leftEyeAxis}°</Typography>
                <Typography>矯正視力: {prescription.leftEyeVision}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>瞳孔間距離 (PD): {prescription.pupilDistance}mm</Typography>
                <Typography>測定日: {prescription.measuredDate.split('T')[0]}</Typography>
                {prescription.notes && (
                  <Typography>備考: {prescription.notes}</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrescriptionDialog(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderEntryPage;