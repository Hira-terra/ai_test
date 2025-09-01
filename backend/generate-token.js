const jwt = require('jsonwebtoken');

const payload = {
  userId: "aa753b2c-3de2-40b0-9b30-9ecc2cd67887",
  userCode: "test001",
  storeId: "b9a98fac-cd05-4075-b024-1e28d696391a",
  role: "admin",
  permissions: [
    "customer:read",
    "customer:write",
    "customer:create",
    "customer:delete",
    "order:read",
    "order:write",
    "order:create",
    "order:cancel",
    "register:operate",
    "register:approve",
    "inventory:read",
    "inventory:write",
    "analytics:store",
    "analytics:all",
    "user:read",
    "user:write",
    "user:create",
    "cost:read",
    "sensitive:read"
  ],
  sessionId: "ee2fd496-25bf-4134-9a5e-139917abd50d",
  jti: "55263025-d472-4022-80cc-0d6c722b2332",
  aud: "glasses-store-client",
  iss: "glasses-store-api"
};

const token = jwt.sign(payload, 'fee476d365a8121563f73089e9e0bfb8c63478336e82157c4e7e0b7cc692873d', {
  expiresIn: '24h'
});

console.log('Token:', token);
console.log('\n使用方法:');
console.log('1. ブラウザでログイン画面を開く');
console.log('2. 開発者ツールのコンソールで以下を実行:');
console.log(`localStorage.setItem('authToken', '${token}');`);
console.log(`localStorage.setItem('userInfo', '${JSON.stringify({
  id: payload.userId,
  userCode: payload.userCode,
  name: 'テストユーザー',
  store: {
    id: payload.storeId,
    name: 'テスト店舗'
  }
})}');`);
console.log('3. 顧客検索画面に直接アクセス: http://localhost:3001/static/customer-search.html');