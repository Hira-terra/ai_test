class UniqueDataFactory {
  constructor() {
    this.counters = new Map();
  }

  getNextId(prefix) {
    const current = this.counters.get(prefix) || 0;
    const next = current + 1;
    this.counters.set(prefix, next);
    return next;
  }

  generateUniqueEmail(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const id = this.getNextId('email');
    return `${prefix}-${timestamp}-${id}-${random}@test.com`;
  }

  generateUniqueUserCode(prefix = 'USR') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = this.getNextId('user').toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}${id}`;
  }

  generateUniqueStoreCode(prefix = 'ST') {
    const timestamp = Date.now().toString(36).substring(-4).toUpperCase();
    const id = this.getNextId('store').toString().padStart(3, '0');
    return `${prefix}${timestamp}${id}`;
  }

  generateUniqueCustomerCode(prefix = 'CST') {
    const timestamp = Date.now().toString(36);
    const id = this.getNextId('customer').toString().padStart(5, '0');
    return `${prefix}${timestamp}${id}`;
  }

  generateUniqueOrderNumber(prefix = 'ORD') {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const id = this.getNextId('order').toString().padStart(5, '0');
    return `${prefix}${date}${id}`;
  }

  generateUniquePhoneNumber() {
    const area = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 9000) + 1000;
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    return `0${area}-${prefix}-${suffix}`;
  }

  generateUniqueMobileNumber() {
    const carrier = ['70', '80', '90'][Math.floor(Math.random() * 3)];
    const middle = Math.floor(Math.random() * 9000) + 1000;
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    return `0${carrier}-${middle}-${suffix}`;
  }

  generateUniquePostalCode() {
    const prefix = Math.floor(Math.random() * 900) + 100;
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${suffix}`;
  }

  generateUniqueAddress(prefecture = '東京都') {
    const id = this.getNextId('address');
    const districts = ['渋谷区', '新宿区', '港区', '千代田区', '中央区'];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const street = `テスト町${id}-${Math.floor(Math.random() * 99) + 1}-${Math.floor(Math.random() * 99) + 1}`;
    return `${prefecture}${district}${street}`;
  }

  generateUniqueSerialNumber(prefix = 'SN') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = this.getNextId('serial').toString().padStart(5, '0');
    return `${prefix}-${timestamp}-${random}-${id}`;
  }

  reset() {
    this.counters.clear();
  }
}

export default new UniqueDataFactory();