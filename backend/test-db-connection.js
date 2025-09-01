const { Pool } = require('pg');

async function testConnection() {
  const db = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'glasses_store_db',
    user: 'glasses_user',
    password: 'changeme_postgres',
    connectionTimeoutMillis: 5000,
    max: 1
  });

  try {
    console.log('データベース接続をテストしています...');
    const result = await db.query('SELECT COUNT(*) as count FROM customers');
    console.log('接続成功！顧客データ件数:', result.rows[0].count);
    
    // サンプルデータを取得
    const customers = await db.query('SELECT customer_code, last_name, first_name FROM customers LIMIT 3');
    console.log('サンプルデータ:');
    customers.rows.forEach(customer => {
      console.log(`- ${customer.customer_code}: ${customer.last_name} ${customer.first_name}`);
    });
    
  } catch (error) {
    console.error('データベース接続エラー:', error.message);
  } finally {
    await db.end();
  }
}

testConnection();