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
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { 
  Product, 
  Frame, 
  Customer, 
  Prescription, 
  PaymentMethod,
  OrderItem,
  OrderStatus,
  Discount,
  OrderDiscount
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
  const [latestPrescription, setLatestPrescription] = useState<Prescription | null>(null); // 前回処方箋（コピー用）
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
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  
  // 処方箋入力フォーム状態
  const [prescriptionForm, setPrescriptionForm] = useState({
    rightEyeSphere: '',
    rightEyeCylinder: '',
    rightEyeAxis: '',
    rightEyeVision: '',
    leftEyeSphere: '',
    leftEyeCylinder: '',
    leftEyeAxis: '',
    leftEyeVision: '',
    pupilDistance: '',
    measuredDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // 商品選択用の状態
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // 値引き関連の状態
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [appliedDiscounts, setAppliedDiscounts] = useState<OrderDiscount[]>([]);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  // 将来的に使用予定
  // const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  // const [discountCalculationResults, setDiscountCalculationResults] = useState<DiscountCalculationResult[]>([]);
  const [requiresManagerApproval, setRequiresManagerApproval] = useState(false);

  // モック値引きマスタデータ（後でAPIから取得に変更）
  const mockDiscounts: Discount[] = [
    {
      id: 'D001',
      discountCode: 'PERCENT_5',
      name: '5%割引',
      type: 'percentage',
      value: 5,
      minOrderAmount: 0,
      maxDiscountAmount: 5000,
      applicableTo: 'order',
      requiresManagerApproval: false,
      currentUses: 0,
      isActive: true,
      displayOrder: 1,
      validFrom: '2024-01-01T00:00:00Z',
      validTo: '2024-12-31T23:59:59Z',
      description: '通常の5%割引',
      createdBy: 'admin001',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'D002',
      discountCode: 'PERCENT_10',
      name: '10%割引',
      type: 'percentage',
      value: 10,
      minOrderAmount: 10000,
      maxDiscountAmount: 10000,
      applicableTo: 'order',
      requiresManagerApproval: true,
      currentUses: 0,
      isActive: true,
      displayOrder: 2,
      validFrom: '2024-01-01T00:00:00Z',
      validTo: '2024-12-31T23:59:59Z',
      description: '1万円以上で10%割引（店長承認必要）',
      createdBy: 'admin001',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'D003',
      discountCode: 'AMOUNT_1000',
      name: '1,000円引き',
      type: 'amount',
      value: 1000,
      minOrderAmount: 5000,
      applicableTo: 'order',
      requiresManagerApproval: false,
      currentUses: 0,
      isActive: true,
      displayOrder: 3,
      validFrom: '2024-01-01T00:00:00Z',
      validTo: '2024-12-31T23:59:59Z',
      description: '5,000円以上で1,000円引き',
      createdBy: 'admin001',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'D004',
      discountCode: 'SENIOR',
      name: 'シニア割引（15%）',
      type: 'percentage',
      value: 15,
      minOrderAmount: 0,
      maxDiscountAmount: 15000,
      applicableTo: 'order',
      requiresManagerApproval: false,
      currentUses: 0,
      isActive: true,
      displayOrder: 4,
      validFrom: '2024-01-01T00:00:00Z',
      validTo: '2024-12-31T23:59:59Z',
      description: '65歳以上のお客様限定',
      createdBy: 'admin001',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'D005',
      discountCode: 'STAFF',
      name: 'スタッフ割引（20%）',
      type: 'percentage',
      value: 20,
      minOrderAmount: 0,
      maxDiscountAmount: 20000,
      applicableTo: 'order',
      requiresManagerApproval: true,
      currentUses: 0,
      isActive: true,
      displayOrder: 5,
      validFrom: '2024-01-01T00:00:00Z',
      validTo: '2024-12-31T23:59:59Z',
      description: '店舗スタッフ専用割引（店長承認必要）',
      createdBy: 'admin001',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];
  
  // 商品カテゴリー定義
  const productCategories = [
    { value: 'all', label: 'すべて', icon: '🔍' },
    { value: 'frame', label: 'フレーム', icon: '👓' },
    { value: 'lens', label: 'レンズ', icon: '🔍' },
    { value: 'contact', label: 'コンタクト', icon: '👁️' },
    { value: 'hearing_aid', label: '補聴器', icon: '🦻' },
    { value: 'accessory', label: 'アクセサリー', icon: '🎒' },
  ];

  // 処方箋入力用選択肢
  const prescriptionOptions = {
    // 球面度数: -20.00 から +20.00 まで 0.25 刻み
    sphereOptions: (() => {
      const options = [];
      for (let i = -2000; i <= 2000; i += 25) {
        const value = (i / 100).toFixed(2);
        options.push({ value, label: value });
      }
      return options;
    })(),
    // 円柱度数: -6.00 から +6.00 まで 0.25 刻み
    cylinderOptions: (() => {
      const options = [];
      for (let i = -600; i <= 600; i += 25) {
        const value = (i / 100).toFixed(2);
        options.push({ value, label: value });
      }
      return options;
    })(),
    // 軸: 1 から 180 度まで
    axisOptions: (() => {
      const options = [];
      for (let i = 1; i <= 180; i++) {
        options.push({ value: i.toString(), label: i.toString() });
      }
      return options;
    })(),
    // 矯正視力: 0.1 から 2.0 まで 0.1 刻み
    visionOptions: (() => {
      const options = [];
      for (let i = 1; i <= 20; i++) {
        const value = (i / 10).toFixed(1);
        options.push({ value, label: value });
      }
      return options;
    })(),
    // 瞳孔間距離: 50 から 80mm まで 1mm 刻み
    pdOptions: (() => {
      const options = [];
      for (let i = 50; i <= 80; i++) {
        options.push({ value: i.toString(), label: `${i}mm` });
      }
      return options;
    })()
  };

  // 値引き計算関数
  const calculateDiscount = (discount: Discount, orderAmount: number): number => {
    if (orderAmount < discount.minOrderAmount) return 0;
    
    let calculatedAmount = 0;
    if (discount.type === 'percentage') {
      calculatedAmount = orderAmount * (discount.value / 100);
      if (discount.maxDiscountAmount && calculatedAmount > discount.maxDiscountAmount) {
        calculatedAmount = discount.maxDiscountAmount;
      }
    } else if (discount.type === 'amount') {
      calculatedAmount = discount.value;
    }
    
    return Math.floor(calculatedAmount); // 小数点切り捨て
  };

  // 値引き適用処理
  const applyDiscount = (discount: Discount) => {
    const orderSubtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
    const discountAmount = calculateDiscount(discount, orderSubtotal);
    
    if (discountAmount === 0) {
      setError(`この値引きの適用には最低${discount.minOrderAmount.toLocaleString()}円以上のご注文が必要です`);
      return;
    }

    const orderDiscount: OrderDiscount = {
      id: `OD_${Date.now()}`,
      orderId: '', // 受注確定時に設定
      discountId: discount.id,
      discount: discount,
      discountCode: discount.discountCode,
      discountName: discount.name,
      discountType: discount.type,
      discountValue: discount.value,
      originalAmount: orderSubtotal,
      discountAmount: discountAmount,
      discountedAmount: orderSubtotal - discountAmount,
      approvedBy: discount.requiresManagerApproval ? undefined : 'current_user', // ログインユーザーのID
      approvedAt: discount.requiresManagerApproval ? undefined : new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setAppliedDiscounts(prev => [...prev, orderDiscount]);
    setShowDiscountDialog(false);
    
    if (discount.requiresManagerApproval) {
      setRequiresManagerApproval(true);
    }
  };

  // 値引き削除処理
  const removeDiscount = (orderDiscountId: string) => {
    setAppliedDiscounts(prev => prev.filter(d => d.id !== orderDiscountId));
    
    // 承認が必要な値引きがなくなったら承認フラグを解除
    const hasApprovalRequired = appliedDiscounts
      .filter(d => d.id !== orderDiscountId)
      .some(d => d.discount?.requiresManagerApproval && !d.approvedBy);
    
    setRequiresManagerApproval(hasApprovalRequired);
  };

  // 合計金額計算
  const calculateTotals = () => {
    const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
    const totalDiscountAmount = appliedDiscounts.reduce((total, discount) => total + discount.discountAmount, 0);
    const finalAmount = subtotal - totalDiscountAmount;
    
    return {
      subtotal,
      totalDiscountAmount,
      finalAmount: Math.max(0, finalAmount) // 負の値にならないように
    };
  };

  // 初期化
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // 値引きマスタの初期化
        setAvailableDiscounts(mockDiscounts);
        // @MOCK_TO_API: 顧客情報取得
        if (customerId) {
          const customerResponse = await customerService.getCustomerById(customerId);
          if (customerResponse.success && customerResponse.data) {
            setCustomer(customerResponse.data);
            setActiveStep(1); // 顧客が選択済みなので商品選択ステップへ
          }

          // @REAL_API: 最新処方箋取得（コピー用として保持、自動設定はしない）
          const prescriptionResponse = await customerService.getCustomerPrescriptions(customerId);
          if (prescriptionResponse.success && prescriptionResponse.data && prescriptionResponse.data.length > 0) {
            // 最新の処方箋を取得（日付順でソート）
            const latest = prescriptionResponse.data.sort((a: any, b: any) => 
              new Date(b.measuredDate).getTime() - new Date(a.measuredDate).getTime()
            )[0];
            setLatestPrescription(latest);
            // 処方箋は自動設定せず、空の状態で開始
            setPrescription(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      discountAmount: 0, // 初期値は0
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

    // 最新処方箋を取得（コピー用として保持、自動設定はしない）
    try {
      const prescriptionResponse = await customerService.getCustomerPrescriptions(selectedCustomer.id);
      if (prescriptionResponse.success && prescriptionResponse.data && prescriptionResponse.data.length > 0) {
        // 最新の処方箋を取得（日付順でソート）
        const latest = prescriptionResponse.data.sort((a: any, b: any) => 
          new Date(b.measuredDate).getTime() - new Date(a.measuredDate).getTime()
        )[0];
        setLatestPrescription(latest);
        // 処方箋は自動設定せず、空の状態で開始
        setPrescription(null);
      } else {
        setLatestPrescription(null);
        setPrescription(null);
      }
    } catch (err: any) {
      console.warn('処方箋情報の取得に失敗:', err.message);
      setLatestPrescription(null);
      setPrescription(null);
    }
  };


  // 受注入力リセット（キャンセル）
  const handleCancelOrder = () => {
    const confirmCancel = window.confirm('受注入力をキャンセルしてもよろしいですか？\n入力内容はすべて削除されます。');
    if (confirmCancel) {
      // 全ての状態をリセット
      setCustomer(null);
      setPrescription(null);
      setOrderItems([]);
      setActiveStep(0);
      setPaidAmount(0);
      setIsPartialPayment(false);
      setNotes('');
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      setError(null);
      setShowPrescriptionDialog(false);
      setShowPrescriptionForm(false);
      setPrescriptionForm({
        rightEyeSphere: '',
        rightEyeCylinder: '',
        rightEyeAxis: '',
        rightEyeVision: '',
        leftEyeSphere: '',
        leftEyeCylinder: '',
        leftEyeAxis: '',
        leftEyeVision: '',
        pupilDistance: '',
        measuredDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      // デフォルト納期をリセット
      const defaultDeliveryDate = new Date();
      defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 14);
      setDeliveryDate(defaultDeliveryDate.toISOString().split('T')[0]);
    }
  };

  // 前回処方箋のコピー
  const copyLatestPrescription = () => {
    if (!latestPrescription) {
      alert('コピーする処方箋がありません');
      return;
    }

    setPrescriptionForm({
      rightEyeSphere: latestPrescription.rightEyeSphere?.toString() || '',
      rightEyeCylinder: latestPrescription.rightEyeCylinder?.toString() || '',
      rightEyeAxis: latestPrescription.rightEyeAxis?.toString() || '',
      rightEyeVision: latestPrescription.rightEyeVision?.toString() || '',
      leftEyeSphere: latestPrescription.leftEyeSphere?.toString() || '',
      leftEyeCylinder: latestPrescription.leftEyeCylinder?.toString() || '',
      leftEyeAxis: latestPrescription.leftEyeAxis?.toString() || '',
      leftEyeVision: latestPrescription.leftEyeVision?.toString() || '',
      pupilDistance: latestPrescription.pupilDistance?.toString() || '',
      measuredDate: new Date().toISOString().split('T')[0], // 測定日は今日の日付にする
      notes: latestPrescription.notes || ''
    });

    alert(`前回処方箋（${latestPrescription.measuredDate.split('T')[0]}測定）をコピーしました`);
  };

  // 処方箋保存
  const handleSavePrescription = async () => {
    if (!customer) return;

    setLoading(true);
    setError(null);

    try {
      const prescriptionData = {
        customerId: customer.id,
        rightEyeSphere: parseFloat(prescriptionForm.rightEyeSphere) || 0,
        rightEyeCylinder: parseFloat(prescriptionForm.rightEyeCylinder) || 0,
        rightEyeAxis: parseInt(prescriptionForm.rightEyeAxis) || 0,
        rightEyeVision: parseFloat(prescriptionForm.rightEyeVision) || 1.0,
        leftEyeSphere: parseFloat(prescriptionForm.leftEyeSphere) || 0,
        leftEyeCylinder: parseFloat(prescriptionForm.leftEyeCylinder) || 0,
        leftEyeAxis: parseInt(prescriptionForm.leftEyeAxis) || 0,
        leftEyeVision: parseFloat(prescriptionForm.leftEyeVision) || 1.0,
        pupilDistance: parseFloat(prescriptionForm.pupilDistance) || 0,
        measuredDate: prescriptionForm.measuredDate,
        notes: prescriptionForm.notes || undefined
      };

      const response = await customerService.createPrescription(customer.id, prescriptionData);

      if (response.success && response.data) {
        setPrescription(response.data);
        setShowPrescriptionForm(false);
        
        // レンズ商品を含む受注がある場合、処方箋完了ステータスに自動更新
        const hasLensProducts = orderItems.some(item => item.product?.category === 'lens');
        if (hasLensProducts && orderItems.length > 0) {
          // 既に受注が確定している場合は、処方箋完了ステータスに更新
          // ※ 受注確定前の場合は、受注確定時に自動的に適切なステータスが設定される
          alert('処方箋が保存されました。\nレンズ商品を含む受注のため、受注確定後に発注対象となります。');
        } else {
          alert('処方箋が保存されました');
        }
      } else {
        throw new Error(response.error?.message || '処方箋の保存に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '処方箋の保存に失敗しました');
    } finally {
      setLoading(false);
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
      // 商品カテゴリと処方箋の有無に基づいてステータスを決定
      const hasLensProducts = orderItems.some(item => item.product?.category === 'lens');
      const hasPrescription = prescription != null;
      
      // ステータス決定ロジック
      let orderStatus: OrderStatus = 'ordered'; // デフォルト
      if (hasLensProducts && hasPrescription) {
        orderStatus = 'prescription_done'; // レンズ商品あり + 処方箋あり = 発注対象
      }
      
      // @REAL_API: 受注作成
      const orderData = {
        customerId: customer.id,
        status: orderStatus, // 自動決定されたステータス
        items: orderItems.map(item => ({
          productId: item.productId,
          frameId: item.frameId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
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
        let successMessage = `受注が正常に作成されました。\n受注番号: ${response.data.orderNumber}`;
        
        // ステータスに応じたメッセージを追加
        if (orderStatus === 'prescription_done') {
          successMessage += '\n\n✅ レンズ商品 + 処方箋完了のため、発注管理画面で発注対象として表示されます。';
        } else if (hasLensProducts && !hasPrescription) {
          successMessage += '\n\n⚠️ レンズ商品が含まれていますが処方箋未入力のため、処方箋入力後に発注対象となります。';
        } else {
          successMessage += '\n\n📦 フレーム等商品のため、在庫状況に応じて発注対象となります。';
        }
        
        alert(successMessage);
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

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          受注入力
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={handleCancelOrder}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            リロード
          </Button>
        </Box>
      </Box>

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
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowPrescriptionForm(true)}
                  >
                    {prescription ? '処方箋更新' : '処方箋入力'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ステップ 1: 商品選択 */}
      {activeStep === 1 && customer && (
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

                  
                  {/* 商品選択完了ボタン */}
                  <Box mt={3} textAlign="center">
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => setActiveStep(2)}
                      disabled={orderItems.length === 0}
                      sx={{ minWidth: 200 }}
                    >
                      金額確認へ進む
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {/* ステップ 2: 金額確認 */}
      {activeStep === 2 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              金額確認
            </Typography>
            
            {/* 注文商品一覧 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                注文商品
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>商品名</TableCell>
                    <TableCell align="center">数量</TableCell>
                    <TableCell align="right">単価</TableCell>
                    <TableCell align="right">小計</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.product?.name}
                        </Typography>
                        {item.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {item.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">¥{item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell align="right">¥{item.totalPrice.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* 値引き情報 */}
            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">
                  値引き
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowDiscountDialog(true)}
                  disabled={orderItems.length === 0}
                >
                  値引き追加
                </Button>
              </Box>
              
              {appliedDiscounts.length > 0 ? (
                <Box>
                  {appliedDiscounts.map((discount) => (
                    <Card key={discount.id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight="medium">
                                {discount.discountName}
                              </Typography>
                              {!discount.approvedBy && (
                                <Chip 
                                  label="承認待ち" 
                                  size="small" 
                                  color="warning" 
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {discount.discountType === 'percentage' 
                                ? `${discount.discountValue}%引き`
                                : `${discount.discountValue.toLocaleString()}円引き`
                              }
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color="error" fontWeight="bold">
                              -¥{discount.discountAmount.toLocaleString()}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => removeDiscount(discount.id)}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  値引きは適用されていません
                </Typography>
              )}
            </Box>

            {/* 金額合計 */}
            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body1">小計</Typography>
                <Typography variant="body1">
                  ¥{calculateTotals().subtotal.toLocaleString()}
                </Typography>
              </Box>
              
              {calculateTotals().totalDiscountAmount > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1" color="error">値引き合計</Typography>
                  <Typography variant="body1" color="error">
                    -¥{calculateTotals().totalDiscountAmount.toLocaleString()}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 1 }} />
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold">合計金額</Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  ¥{calculateTotals().finalAmount.toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* 店長承認が必要な場合の警告 */}
            {requiresManagerApproval && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  店長承認が必要な値引きが含まれています。受注確定前に店長の承認を取得してください。
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ステップ 3: 入金・完了 */}
      {activeStep === 3 && (
        <Grid container spacing={3}>
          {/* 受注内容確認エリア */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  受注内容確認
                </Typography>

                {/* 選択商品一覧 */}
                {orderItems.length > 0 ? (
                  <Table size="small" sx={{ mb: 3 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>商品名</TableCell>
                        <TableCell align="center">数量</TableCell>
                        <TableCell align="right">単価</TableCell>
                        <TableCell align="right">小計</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.product?.name}
                            </Typography>
                            {item.notes && (
                              <Typography variant="caption" color="text.secondary">
                                {item.notes}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">¥{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell align="right">¥{item.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert severity="info">
                    商品が選択されていません
                  </Alert>
                )}

                {/* 値引き表示 */}
                {appliedDiscounts.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      適用値引き
                    </Typography>
                    {appliedDiscounts.map((discount) => (
                      <Box key={discount.id} display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2">{discount.discountName}</Typography>
                        <Typography variant="body2" color="error">
                          -¥{discount.discountAmount.toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* 金額計算 */}
                {orderItems.length > 0 && (
                  <Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body1">小計</Typography>
                      <Typography variant="body1">
                        ¥{calculateTotals().subtotal.toLocaleString()}
                      </Typography>
                    </Box>
                    
                    {calculateTotals().totalDiscountAmount > 0 && (
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body1" color="error">値引き合計</Typography>
                        <Typography variant="body1" color="error">
                          -¥{calculateTotals().totalDiscountAmount.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box display="flex" justifyContent="space-between" sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                      <Typography variant="h6">合計金額</Typography>
                      <Typography variant="h6" color="primary">
                        ¥{calculateTotals().finalAmount.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 入金情報エリア */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  入金・完了処理
                </Typography>
                
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
                              const finalAmount = calculateTotals().finalAmount;
                              setPaidAmount(finalAmount);
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
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ナビゲーションボタン */}
      {customer && (
        <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
          >
            戻る
          </Button>
          
          <Box display="flex" gap={1}>
            {activeStep < 2 && (
              <Button
                variant="contained"
                onClick={() => setActiveStep(prev => prev + 1)}
                disabled={
                  (activeStep === 0 && !customer) ||
                  (activeStep === 1 && orderItems.length === 0)
                }
              >
                次へ
              </Button>
            )}
            
            {activeStep === 2 && (
              <Button
                variant="contained"
                onClick={() => setActiveStep(3)}
                disabled={orderItems.length === 0 || requiresManagerApproval}
              >
                入金・完了へ
              </Button>
            )}
          </Box>
        </Box>
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

      {/* 処方箋入力ダイアログ */}
      <Dialog
        open={showPrescriptionForm}
        onClose={() => setShowPrescriptionForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">処方箋入力</Typography>
            {latestPrescription && (
              <Button
                variant="outlined"
                size="small"
                onClick={copyLatestPrescription}
                startIcon={<ContentCopyIcon />}
              >
                前回処方箋コピー（{latestPrescription.measuredDate.split('T')[0]}測定）
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* 右眼 */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                右眼 (R)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>球面度数 (S)</InputLabel>
                    <Select
                      value={prescriptionForm.rightEyeSphere}
                      label="球面度数 (S)"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeSphere: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.sphereOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      ディオプター (D)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>円柱度数 (C)</InputLabel>
                    <Select
                      value={prescriptionForm.rightEyeCylinder}
                      label="円柱度数 (C)"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeCylinder: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.cylinderOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      ディオプター (D)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>軸 (AX)</InputLabel>
                    <Select
                      value={prescriptionForm.rightEyeAxis}
                      label="軸 (AX)"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeAxis: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.axisOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      度 (°)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>矯正視力</InputLabel>
                    <Select
                      value={prescriptionForm.rightEyeVision}
                      label="矯正視力"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, rightEyeVision: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.visionOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      視力値
                    </Typography>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>

            {/* 左眼 */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="secondary">
                左眼 (L)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>球面度数 (S)</InputLabel>
                    <Select
                      value={prescriptionForm.leftEyeSphere}
                      label="球面度数 (S)"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeSphere: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.sphereOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      ディオプター (D)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>円柱度数 (C)</InputLabel>
                    <Select
                      value={prescriptionForm.leftEyeCylinder}
                      label="円柱度数 (C)"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeCylinder: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.cylinderOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      ディオプター (D)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>軸 (AX)</InputLabel>
                    <Select
                      value={prescriptionForm.leftEyeAxis}
                      label="軸 (AX)"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeAxis: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.axisOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      度 (°)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>矯正視力</InputLabel>
                    <Select
                      value={prescriptionForm.leftEyeVision}
                      label="矯正視力"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, leftEyeVision: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.visionOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      視力値
                    </Typography>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>

            {/* 共通項目 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>瞳孔間距離 (PD)</InputLabel>
                    <Select
                      value={prescriptionForm.pupilDistance}
                      label="瞳孔間距離 (PD)"
                      onChange={(e) => setPrescriptionForm(prev => ({...prev, pupilDistance: e.target.value}))}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {prescriptionOptions.pdOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      ミリメートル (mm)
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="測定日"
                    type="date"
                    value={prescriptionForm.measuredDate}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, measuredDate: e.target.value}))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  {/* スペーサー */}
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="備考"
                    multiline
                    rows={3}
                    value={prescriptionForm.notes}
                    onChange={(e) => setPrescriptionForm(prev => ({...prev, notes: e.target.value}))}
                    placeholder="検眼時の特記事項など"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrescriptionForm(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSavePrescription}
            variant="contained"
            disabled={loading}
          >
            {loading ? '保存中...' : '処方箋保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 値引き選択ダイアログ */}
      <Dialog
        open={showDiscountDialog}
        onClose={() => setShowDiscountDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>値引き選択</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            適用可能な値引きを選択してください
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            {availableDiscounts.map((discount) => {
              const orderSubtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
              const calculatedAmount = calculateDiscount(discount, orderSubtotal);
              const isApplicable = calculatedAmount > 0;
              
              return (
                <Card 
                  key={discount.id} 
                  sx={{ 
                    mb: 2, 
                    cursor: isApplicable ? 'pointer' : 'not-allowed',
                    opacity: isApplicable ? 1 : 0.6,
                    '&:hover': {
                      bgcolor: isApplicable ? 'action.hover' : 'inherit'
                    }
                  }}
                  onClick={() => isApplicable && applyDiscount(discount)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" fontWeight="bold">
                            {discount.name}
                          </Typography>
                          {discount.requiresManagerApproval && (
                            <Chip 
                              label="店長承認必要" 
                              size="small" 
                              color="warning" 
                            />
                          )}
                        </Box>
                        
                        <Typography color="text.secondary" gutterBottom>
                          {discount.description}
                        </Typography>
                        
                        <Box display="flex" gap={2} alignItems="center">
                          <Typography variant="body2">
                            {discount.type === 'percentage' 
                              ? `${discount.value}%引き`
                              : `${discount.value.toLocaleString()}円引き`
                            }
                          </Typography>
                          
                          {discount.minOrderAmount > 0 && (
                            <Typography variant="body2" color="text.secondary">
                              最低注文額: {discount.minOrderAmount.toLocaleString()}円
                            </Typography>
                          )}
                          
                          {discount.maxDiscountAmount && (
                            <Typography variant="body2" color="text.secondary">
                              上限: {discount.maxDiscountAmount.toLocaleString()}円
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      
                      <Box textAlign="right">
                        <Typography 
                          variant="h6" 
                          color={isApplicable ? "primary" : "text.disabled"}
                          fontWeight="bold"
                        >
                          -{calculatedAmount.toLocaleString()}円
                        </Typography>
                        
                        {!isApplicable && discount.minOrderAmount > orderSubtotal && (
                          <Typography variant="caption" color="error">
                            {discount.minOrderAmount.toLocaleString()}円以上必要
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDiscountDialog(false)}>
            キャンセル
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderEntryPage;