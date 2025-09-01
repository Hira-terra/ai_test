import dbHelper from './db-test-helper';

class TestIsolation {
  constructor() {
    this.activeTransactions = new Map();
  }

  async beginTestTransaction(testId) {
    const client = await dbHelper.beginTransaction();
    this.activeTransactions.set(testId, client);
    return client;
  }

  async endTestTransaction(testId, commit = false) {
    const client = this.activeTransactions.get(testId);
    if (!client) {
      console.warn(`No active transaction found for test: ${testId}`);
      return;
    }

    try {
      if (commit) {
        await dbHelper.commitTransaction(client);
      } else {
        await dbHelper.rollbackTransaction(client);
      }
    } finally {
      this.activeTransactions.delete(testId);
    }
  }

  async rollbackAll() {
    for (const [testId, client] of this.activeTransactions) {
      try {
        await dbHelper.rollbackTransaction(client);
      } catch (error) {
        console.error(`Failed to rollback transaction for test ${testId}:`, error);
      }
    }
    this.activeTransactions.clear();
  }

  getClient(testId) {
    return this.activeTransactions.get(testId);
  }

  generateTestId() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export default new TestIsolation();