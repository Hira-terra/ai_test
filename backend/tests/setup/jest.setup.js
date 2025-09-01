// Jest Setup
process.env.NODE_ENV = 'test';

// Set test environment variables
process.env.DB_HOST = process.env.DB_HOST || 'postgres';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'glasses_store_db';
process.env.DB_USER = process.env.DB_USER || 'glasses_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'glasses_dev_password_123';

process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

// Increase test timeout for integration tests
jest.setTimeout(30000);