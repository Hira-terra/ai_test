import { Router } from 'express';
import { CustomerController, upload } from '../controllers/customer.controller';
import { authenticate as authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

export class CustomerRoutes {
  private router: Router;
  private customerController: CustomerController;

  constructor() {
    this.router = Router();
    this.customerController = new CustomerController();
    this.initializeRoutes();
    logger.info('[CustomerRoutes] ルート初期化完了');
  }

  private initializeRoutes(): void {
    // ============================================
    // 顧客管理ルート
    // ============================================
    
    /**
     * 顧客検索
     * GET /api/customers
     * 
     * クエリパラメータ:
     * - search: 検索キーワード（名前、カナ、顧客コード）
     * - phone: 電話番号（部分一致）
     * - address: 住所（部分一致）
     * - ownStoreOnly: true/false（自店舗のみ検索）
     * - page: ページ番号（デフォルト: 1）
     * - limit: 表示件数（デフォルト: 20、最大: 100）
     * - sort: ソート順（name/kana/last_visit_date）
     */
    this.router.get(
      '/',
      authMiddleware,
      this.customerController.searchCustomers
    );

    /**
     * 顧客詳細取得
     * GET /api/customers/:id
     */
    this.router.get(
      '/:id',
      authMiddleware,
      this.customerController.getCustomerById
    );

    /**
     * 顧客作成
     * POST /api/customers
     * 
     * リクエストボディ:
     * - lastName: 姓（必須）
     * - firstName: 名（必須）
     * - lastNameKana: 姓カナ（任意）
     * - firstNameKana: 名カナ（任意）
     * - gender: 性別（male/female/other）
     * - birthDate: 生年月日（ISO 8601）
     * - phone: 電話番号（任意）
     * - mobile: 携帯電話番号（任意）
     * - email: メールアドレス（任意）
     * - postalCode: 郵便番号（任意）
     * - address: 住所（任意）
     * - notes: 備考（任意）
     */
    this.router.post(
      '/',
      authMiddleware,
      this.customerController.createCustomer
    );

    /**
     * 顧客更新
     * PUT /api/customers/:id
     * 
     * リクエストボディ: 顧客作成と同様（部分更新対応）
     */
    this.router.put(
      '/:id',
      authMiddleware,
      this.customerController.updateCustomer
    );

    // ============================================
    // 処方箋管理ルート
    // ============================================

    /**
     * 顧客の処方箋一覧取得
     * GET /api/customers/:customerId/prescriptions
     */
    this.router.get(
      '/:customerId/prescriptions',
      authMiddleware,
      this.customerController.getCustomerPrescriptions
    );

    /**
     * 処方箋作成
     * POST /api/customers/:customerId/prescriptions
     * 
     * リクエストボディ:
     * - measuredDate: 測定日（必須、ISO 8601）
     * - rightEyeSphere: 右眼球面度数（任意）
     * - rightEyeCylinder: 右眼円柱度数（任意）
     * - rightEyeAxis: 右眼軸（任意）
     * - rightEyeVision: 右眼視力（任意）
     * - leftEyeSphere: 左眼球面度数（任意）
     * - leftEyeCylinder: 左眼円柱度数（任意）
     * - leftEyeAxis: 左眼軸（任意）
     * - leftEyeVision: 左眼視力（任意）
     * - pupilDistance: 瞳孔間距離（任意）
     * - notes: 備考（任意）
     */
    this.router.post(
      '/:customerId/prescriptions',
      authMiddleware,
      this.customerController.createPrescription
    );

    // ============================================
    // 画像管理ルート
    // ============================================

    /**
     * 顧客画像一覧取得
     * GET /api/customers/:customerId/images
     */
    this.router.get(
      '/:customerId/images',
      authMiddleware,
      this.customerController.getCustomerImages
    );

    /**
     * 顧客画像アップロード
     * POST /api/customers/:customerId/images
     * 
     * マルチパートフォーム:
     * - image: 画像ファイル（必須、JPEG/PNG/GIF、最大10MB）
     * - imageType: 画像タイプ（face/glasses/prescription/other）
     * - title: タイトル（任意）
     * - description: 説明（任意）
     * - capturedDate: 撮影日（任意、ISO 8601）
     */
    this.router.post(
      '/:customerId/images',
      authMiddleware,
      upload.single('image'),
      this.customerController.uploadCustomerImage
    );

    /**
     * 顧客画像削除
     * DELETE /api/customers/:customerId/images/:imageId
     */
    this.router.delete(
      '/:customerId/images/:imageId',
      authMiddleware,
      this.customerController.deleteCustomerImage
    );

    // ============================================
    // 購入履歴管理ルート
    // ============================================

    /**
     * 顧客購入履歴取得
     * GET /api/customers/:customerId/orders
     */
    this.router.get(
      '/:customerId/orders',
      authMiddleware,
      this.customerController.getCustomerOrders
    );

    // ============================================
    // メモ管理ルート
    // ============================================

    /**
     * 顧客メモ一覧取得
     * GET /api/customers/:customerId/memos
     */
    this.router.get(
      '/:customerId/memos',
      authMiddleware,
      this.customerController.getCustomerMemos
    );

    /**
     * 顧客メモ作成
     * POST /api/customers/:customerId/memos
     * 
     * リクエストボディ:
     * - memoText: メモ内容（必須）
     * - memoType: メモタイプ（handwritten/text、デフォルト: text）
     */
    this.router.post(
      '/:customerId/memos',
      authMiddleware,
      this.customerController.createCustomerMemo
    );

    /**
     * 顧客メモ削除
     * DELETE /api/customers/:customerId/memos/:memoId
     */
    this.router.delete(
      '/:customerId/memos/:memoId',
      authMiddleware,
      this.customerController.deleteCustomerMemo
    );

    // ============================================
    // エラーハンドリングミドルウェア
    // ============================================

    // Multerエラーハンドリング
    this.router.use((error: any, req: any, res: any, next: any) => {
      if (error instanceof Error) {
        if (error.message.includes('File too large')) {
          logger.warn('ファイルサイズ上限エラー:', { 
            originalname: req.file?.originalname,
            size: req.file?.size 
          });
          return res.status(413).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'ファイルサイズが上限を超えています。10MB以下のファイルをアップロードしてください。'
            }
          });
        }

        if (error.message.includes('許可されていないファイル形式')) {
          logger.warn('ファイル形式エラー:', { 
            mimetype: req.file?.mimetype 
          });
          return res.status(415).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_MEDIA_TYPE',
              message: error.message
            }
          });
        }

        // その他のMulterエラー
        logger.error('ファイルアップロードエラー:', error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'ファイルアップロード中にエラーが発生しました。'
          }
        });
      }

      next(error);
    });

    logger.info('[CustomerRoutes] ルート設定完了', {
      routes: [
        'GET /customers',
        'GET /customers/:id',
        'POST /customers',
        'PUT /customers/:id',
        'GET /customers/:customerId/prescriptions',
        'POST /customers/:customerId/prescriptions',
        'GET /customers/:customerId/images',
        'POST /customers/:customerId/images',
        'DELETE /customers/:customerId/images/:imageId',
        'GET /customers/:customerId/orders',
        'GET /customers/:customerId/memos',
        'POST /customers/:customerId/memos',
        'DELETE /customers/:customerId/memos/:memoId'
      ]
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}

// デフォルトエクスポート
const customerRoutes = new CustomerRoutes();
export default customerRoutes.getRouter();