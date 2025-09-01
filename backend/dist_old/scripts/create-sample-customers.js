"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSampleCustomers = createSampleCustomers;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
const sampleCustomers = [
    {
        customerCode: 'C00000001',
        lastName: '田中',
        firstName: '太郎',
        lastNameKana: 'タナカ',
        firstNameKana: 'タロウ',
        gender: 'male',
        birthDate: '1980-05-15',
        phone: '03-1234-5678',
        mobile: '090-1234-5678',
        email: 'tanaka@example.com',
        postalCode: '123-4567',
        address: '東京都新宿区西新宿1-1-1',
        visitCount: 5,
        totalPurchaseAmount: 125000,
        notes: '遠視用メガネを愛用。定期的にメンテナンスに来店。'
    },
    {
        customerCode: 'C00000002',
        lastName: '佐藤',
        firstName: '花子',
        lastNameKana: 'サトウ',
        firstNameKana: 'ハナコ',
        gender: 'female',
        birthDate: '1985-09-22',
        phone: '03-2345-6789',
        mobile: '090-2345-6789',
        email: 'sato@example.com',
        postalCode: '234-5678',
        address: '東京都渋谷区渋谷2-2-2',
        visitCount: 3,
        totalPurchaseAmount: 95000,
        notes: 'ファッション性を重視したフレーム選び。'
    },
    {
        customerCode: 'C00000003',
        lastName: '鈴木',
        firstName: '一郎',
        lastNameKana: 'スズキ',
        firstNameKana: 'イチロウ',
        gender: 'male',
        birthDate: '1975-12-10',
        phone: '03-3456-7890',
        mobile: '090-3456-7890',
        email: 'suzuki@example.com',
        postalCode: '345-6789',
        address: '東京都港区赤坂3-3-3',
        visitCount: 8,
        totalPurchaseAmount: 210000,
        notes: 'ビジネス用とプライベート用の2本持ち。'
    },
    {
        customerCode: 'C00000004',
        lastName: '高橋',
        firstName: '美和',
        lastNameKana: 'タカハシ',
        firstNameKana: 'ミワ',
        gender: 'female',
        birthDate: '1992-03-08',
        phone: '03-4567-8901',
        mobile: '090-4567-8901',
        email: 'takahashi@example.com',
        postalCode: '456-7890',
        address: '東京都品川区大井4-4-4',
        visitCount: 2,
        totalPurchaseAmount: 48000,
        notes: '初回来店。コンタクトレンズから眼鏡に変更希望。'
    },
    {
        customerCode: 'C00000005',
        lastName: '伊藤',
        firstName: '健太',
        lastNameKana: 'イトウ',
        firstNameKana: 'ケンタ',
        gender: 'male',
        birthDate: '1988-07-18',
        phone: '03-5678-9012',
        mobile: '090-5678-9012',
        email: 'ito@example.com',
        postalCode: '567-8901',
        address: '東京都世田谷区三軒茶屋5-5-5',
        visitCount: 6,
        totalPurchaseAmount: 156000,
        notes: 'スポーツ用サングラスも購入。アクティブなライフスタイル。'
    },
    {
        customerCode: 'C00000006',
        lastName: '渡辺',
        firstName: '由美',
        lastNameKana: 'ワタナベ',
        firstNameKana: 'ユミ',
        gender: 'female',
        birthDate: '1979-11-25',
        phone: '03-6789-0123',
        mobile: '090-6789-0123',
        email: 'watanabe@example.com',
        postalCode: '678-9012',
        address: '東京都杉並区荻窪6-6-6',
        visitCount: 4,
        totalPurchaseAmount: 89000,
        notes: '老眼鏡の度数調整で来店。プログレッシブレンズを検討中。'
    },
    {
        customerCode: 'C00000007',
        lastName: '山本',
        firstName: '大樹',
        lastNameKana: 'ヤマモト',
        firstNameKana: 'ダイキ',
        gender: 'male',
        birthDate: '1995-01-30',
        phone: '03-7890-1234',
        mobile: '090-7890-1234',
        email: 'yamamoto@example.com',
        postalCode: '789-0123',
        address: '東京都中野区中野7-7-7',
        visitCount: 1,
        totalPurchaseAmount: 35000,
        notes: '学生割引適用。PCメガネとして利用。'
    },
    {
        customerCode: 'C00000008',
        lastName: '中村',
        firstName: '聡子',
        lastNameKana: 'ナカムラ',
        firstNameKana: 'サトコ',
        gender: 'female',
        birthDate: '1983-06-12',
        phone: '03-8901-2345',
        mobile: '090-8901-2345',
        email: 'nakamura@example.com',
        postalCode: '890-1234',
        address: '東京都練馬区練馬8-8-8',
        visitCount: 7,
        totalPurchaseAmount: 178000,
        notes: '家族割引適用。お子様のメガネも一緒に購入。'
    },
    {
        customerCode: 'C00000009',
        lastName: '小林',
        firstName: '正和',
        lastNameKana: 'コバヤシ',
        firstNameKana: 'マサカズ',
        gender: 'male',
        birthDate: '1972-04-03',
        phone: '03-9012-3456',
        mobile: '090-9012-3456',
        email: 'kobayashi@example.com',
        postalCode: '901-2345',
        address: '東京都足立区足立9-9-9',
        visitCount: 10,
        totalPurchaseAmount: 285000,
        notes: '長期顧客。遠近両用レンズを愛用。定期的なメンテナンス契約あり。'
    },
    {
        customerCode: 'C00000010',
        lastName: '加藤',
        firstName: '麻衣',
        lastNameKana: 'カトウ',
        firstNameKana: 'マイ',
        gender: 'female',
        birthDate: '1990-08-17',
        phone: '03-0123-4567',
        mobile: '090-0123-4567',
        email: 'kato@example.com',
        postalCode: '012-3456',
        address: '東京都板橋区板橋10-10-10',
        visitCount: 3,
        totalPurchaseAmount: 72000,
        notes: 'デザイナーズフレーム希望。トレンドに敏感。'
    }
];
async function createSampleCustomers() {
    try {
        console.log('サンプル顧客データの作成を開始します...');
        for (const customer of sampleCustomers) {
            const customerId = (0, uuid_1.v4)();
            const firstVisitDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            const lastVisitDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            const insertQuery = `
        INSERT INTO customers (
          id, customer_code, last_name, first_name, last_name_kana, first_name_kana,
          gender, birth_date, phone, mobile, email, postal_code, address,
          visit_count, total_purchase_amount, notes, 
          first_visit_date, last_visit_date, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
        ) ON CONFLICT (customer_code) DO NOTHING
      `;
            await database_1.db.query(insertQuery, [
                customerId,
                customer.customerCode,
                customer.lastName,
                customer.firstName,
                customer.lastNameKana,
                customer.firstNameKana,
                customer.gender,
                customer.birthDate,
                customer.phone,
                customer.mobile,
                customer.email,
                customer.postalCode,
                customer.address,
                customer.visitCount,
                customer.totalPurchaseAmount,
                customer.notes,
                firstVisitDate.toISOString(),
                lastVisitDate.toISOString()
            ]);
            console.log(`顧客作成: ${customer.customerCode} - ${customer.lastName} ${customer.firstName}`);
        }
        console.log('サンプル顧客データの作成が完了しました！');
        console.log(`作成された顧客数: ${sampleCustomers.length}名`);
    }
    catch (error) {
        console.error('サンプル顧客データの作成中にエラーが発生しました:', error);
    }
    finally {
        await database_1.db.close();
    }
}
if (require.main === module) {
    createSampleCustomers();
}
//# sourceMappingURL=create-sample-customers.js.map